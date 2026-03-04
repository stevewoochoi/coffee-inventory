package com.coffee.domain.ordering.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.ordering.dto.CutoffDto;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.*;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrderCutoffService {

    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final OrderShortageLogRepository shortageLogRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final StoreRepository storeRepository;

    @Transactional
    public CutoffDto.CutoffResult executeCutoff(LocalDate deliveryDate, Long executedBy) {
        List<OrderPlan> targets = planRepository.findByDeliveryDateAndStatus(deliveryDate, OrderStatus.CONFIRMED);
        for (OrderPlan plan : targets) {
            plan.setStatus(OrderStatus.CUTOFF_CLOSED);
        }
        planRepository.saveAll(targets);
        log.info("Cutoff executed for {} - {} orders closed by user {}", deliveryDate, targets.size(), executedBy);
        return CutoffDto.CutoffResult.builder()
                .cutoffCount(targets.size())
                .deliveryDate(deliveryDate)
                .build();
    }

    public CutoffDto.ShortageCheckResult checkShortage(LocalDate deliveryDate, Long brandId) {
        List<OrderPlan> plans = planRepository.findByDeliveryDateAndStatus(deliveryDate, OrderStatus.CUTOFF_CLOSED);

        // Aggregate order lines by item
        Map<Long, List<OrderLineInfo>> itemOrderMap = new HashMap<>();
        for (OrderPlan plan : plans) {
            List<OrderLine> lines = lineRepository.findByOrderPlanId(plan.getId());
            for (OrderLine line : lines) {
                Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
                if (pkg == null) continue;
                itemOrderMap.computeIfAbsent(pkg.getItemId(), k -> new ArrayList<>())
                        .add(new OrderLineInfo(plan, line, pkg));
            }
        }

        List<CutoffDto.ShortageItem> shortageItems = new ArrayList<>();
        int noShortageCount = 0;

        for (Map.Entry<Long, List<OrderLineInfo>> entry : itemOrderMap.entrySet()) {
            Long itemId = entry.getKey();
            Item item = itemRepository.findById(itemId).orElse(null);
            if (item == null) continue;

            // Sum total ordered in base units
            BigDecimal totalOrdered = BigDecimal.ZERO;
            for (OrderLineInfo info : entry.getValue()) {
                BigDecimal lineQty = info.pkg.getUnitsPerPack()
                        .multiply(BigDecimal.valueOf(info.line.getPackQty()));
                totalOrdered = totalOrdered.add(lineQty);
            }

            // Get current stock across all stores for this brand
            BigDecimal currentStock = BigDecimal.ZERO;
            List<Store> stores = storeRepository.findByBrandId(brandId);
            for (Store store : stores) {
                currentStock = currentStock.add(
                        snapshotRepository.sumQtyByStoreIdAndItemId(store.getId(), itemId));
            }

            if (totalOrdered.compareTo(currentStock) > 0) {
                // Shortage detected
                List<CutoffDto.AffectedOrder> affected = entry.getValue().stream()
                        .map(info -> {
                            Store store = storeRepository.findById(info.plan.getStoreId()).orElse(null);
                            return CutoffDto.AffectedOrder.builder()
                                    .orderPlanId(info.plan.getId())
                                    .storeId(info.plan.getStoreId())
                                    .storeName(store != null ? store.getName() : "Unknown")
                                    .orderedPackQty(info.line.getPackQty())
                                    .lineId(info.line.getId())
                                    .build();
                        })
                        .toList();

                shortageItems.add(CutoffDto.ShortageItem.builder()
                        .itemId(itemId)
                        .itemName(item.getName())
                        .itemCode(item.getItemCode())
                        .currentStock(currentStock)
                        .totalOrdered(totalOrdered)
                        .shortageQty(totalOrdered.subtract(currentStock))
                        .unit(item.getBaseUnit())
                        .affectedOrders(affected)
                        .build());
            } else {
                noShortageCount++;
            }
        }

        return CutoffDto.ShortageCheckResult.builder()
                .deliveryDate(deliveryDate)
                .shortageItems(shortageItems)
                .noShortageItems(noShortageCount)
                .build();
    }

    @Transactional
    public void adjustOrderLine(Long planId, Long lineId, int adjustedQty, String reason, Long adjustedBy) {
        OrderPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", planId));
        OrderLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderLine", lineId));

        if (!line.getOrderPlanId().equals(planId)) {
            throw new BusinessException("Order line does not belong to this plan", HttpStatus.BAD_REQUEST);
        }

        int originalQty = line.getPackQty();
        line.setPackQty(adjustedQty);
        lineRepository.save(line);

        // Recalculate plan total
        recalculatePlanTotal(plan);

        // Log shortage adjustment
        shortageLogRepository.save(OrderShortageLog.builder()
                .orderPlanId(planId)
                .orderLineId(lineId)
                .originalQty(originalQty)
                .adjustedQty(adjustedQty)
                .shortageReason(reason)
                .adjustedBy(adjustedBy)
                .build());
    }

    @Transactional
    public CutoffDto.DispatchResult dispatchAll(LocalDate deliveryDate, Long executedBy) {
        List<OrderPlan> plans = planRepository.findByDeliveryDateAndStatus(deliveryDate, OrderStatus.CUTOFF_CLOSED);
        for (OrderPlan plan : plans) {
            plan.setStatus(OrderStatus.DISPATCHED);
            plan.setDispatchedAt(LocalDateTime.now());
        }
        planRepository.saveAll(plans);
        log.info("Dispatched {} orders for {} by user {}", plans.size(), deliveryDate, executedBy);
        return CutoffDto.DispatchResult.builder()
                .dispatchedCount(plans.size())
                .hasUnresolvedShortage(false)
                .build();
    }

    private void recalculatePlanTotal(OrderPlan plan) {
        List<OrderLine> lines = lineRepository.findByOrderPlanId(plan.getId());
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (OrderLine line : lines) {
            BigDecimal linePrice = supplierItemRepository
                    .findBySupplierIdAndPackagingId(plan.getSupplierId(), line.getPackagingId())
                    .map(SupplierItem::getPrice)
                    .orElse(BigDecimal.ZERO);
            totalAmount = totalAmount.add(linePrice.multiply(BigDecimal.valueOf(line.getPackQty())));
        }
        BigDecimal vatAmount = totalAmount.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
        plan.setTotalAmount(totalAmount);
        plan.setVatAmount(vatAmount);
        planRepository.save(plan);
    }

    private record OrderLineInfo(OrderPlan plan, OrderLine line, Packaging pkg) {}
}
