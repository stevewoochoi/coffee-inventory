package com.coffee.domain.ordering.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.dto.OrderPlanDto;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.OrderDispatchLogRepository;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderingService {

    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final OrderDispatchLogRepository dispatchLogRepository;
    private final SupplierRepository supplierRepository;
    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;
    private final SupplierItemRepository supplierItemRepository;

    public List<OrderPlanDto.Response> findByStoreId(Long storeId) {
        return planRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<OrderPlanDto.DetailedResponse> findByStoreIdFiltered(Long storeId, String status) {
        List<OrderPlan> plans;
        if (status != null && !status.isEmpty()) {
            plans = planRepository.findByStoreIdAndStatusOrderByCreatedAtDesc(storeId, OrderStatus.valueOf(status));
        } else {
            plans = planRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        }
        return plans.stream().map(this::toDetailedResponse).toList();
    }

    private OrderPlanDto.DetailedResponse toDetailedResponse(OrderPlan plan) {
        Supplier supplier = supplierRepository.findById(plan.getSupplierId()).orElse(null);
        List<OrderLine> lines = lineRepository.findByOrderPlanId(plan.getId());

        List<OrderPlanDto.HistoryLine> historyLines = lines.stream().map(line -> {
            Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
            Item item = pkg != null ? itemRepository.findById(pkg.getItemId()).orElse(null) : null;
            BigDecimal price = supplierItemRepository
                    .findBySupplierIdAndPackagingId(plan.getSupplierId(), line.getPackagingId())
                    .map(SupplierItem::getPrice)
                    .orElse(BigDecimal.ZERO);

            return OrderPlanDto.HistoryLine.builder()
                    .packagingId(line.getPackagingId())
                    .packName(pkg != null ? pkg.getPackName() : "Unknown")
                    .itemId(pkg != null ? pkg.getItemId() : null)
                    .itemName(item != null ? item.getName() : "Unknown")
                    .packQty(line.getPackQty())
                    .unitsPerPack(pkg != null ? pkg.getUnitsPerPack() : BigDecimal.ZERO)
                    .price(price)
                    .build();
        }).toList();

        return OrderPlanDto.DetailedResponse.builder()
                .id(plan.getId())
                .storeId(plan.getStoreId())
                .supplierId(plan.getSupplierId())
                .supplierName(supplier != null ? supplier.getName() : "Unknown")
                .status(plan.getStatus().name())
                .fulfillmentStatus(plan.getFulfillmentStatus())
                .deliveryDate(plan.getDeliveryDate())
                .cutoffAt(plan.getCutoffAt())
                .totalAmount(plan.getTotalAmount())
                .vatAmount(plan.getVatAmount())
                .recommendedByAi(plan.getRecommendedByAi())
                .lines(historyLines)
                .createdAt(plan.getCreatedAt())
                .confirmedAt(plan.getConfirmedAt())
                .dispatchedAt(plan.getDispatchedAt())
                .receivedAt(plan.getReceivedAt())
                .build();
    }

    public OrderPlanDto.Response findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public OrderPlanDto.Response create(OrderPlanDto.CreateRequest request) {
        OrderPlan plan = OrderPlan.builder()
                .storeId(request.getStoreId())
                .supplierId(request.getSupplierId())
                .build();
        planRepository.save(plan);

        if (request.getLines() != null) {
            for (OrderPlanDto.OrderLineDto line : request.getLines()) {
                lineRepository.save(OrderLine.builder()
                        .orderPlanId(plan.getId())
                        .packagingId(line.getPackagingId())
                        .packQty(line.getPackQty())
                        .build());
            }
        }

        return toResponse(plan);
    }

    @Transactional
    public OrderPlanDto.Response confirm(Long id) {
        OrderPlan plan = getOrThrow(id);
        if (plan.getStatus() != OrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT orders can be confirmed", HttpStatus.BAD_REQUEST);
        }
        plan.setStatus(OrderStatus.CONFIRMED);
        plan.setConfirmedAt(java.time.LocalDateTime.now());
        return toResponse(planRepository.save(plan));
    }

    @Transactional
    public OrderPlanDto.Response dispatch(Long id) {
        OrderPlan plan = getOrThrow(id);
        if (plan.getStatus() != OrderStatus.CONFIRMED) {
            throw new BusinessException("Only CONFIRMED orders can be dispatched", HttpStatus.BAD_REQUEST);
        }

        // 실제 이메일 발송은 SES 연동 시 구현, 여기서는 로그만 기록
        dispatchLogRepository.save(OrderDispatchLog.builder()
                .orderPlanId(id)
                .method(DispatchMethod.EMAIL)
                .status(DispatchStatus.SUCCESS)
                .responseBody("Order dispatched (stub)")
                .build());

        plan.setStatus(OrderStatus.DISPATCHED);
        plan.setDispatchedAt(java.time.LocalDateTime.now());
        return toResponse(planRepository.save(plan));
    }

    public OrderPlanDto.DetailedResponse findByIdDetailed(Long id) {
        return toDetailedResponse(getOrThrow(id));
    }

    public List<OrderPlanDto.HistoryResponse> getOrderHistory(Long storeId, int limit) {
        List<OrderPlan> plans = planRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        return plans.stream()
                .limit(limit)
                .map(plan -> {
                    Supplier supplier = supplierRepository.findById(plan.getSupplierId()).orElse(null);
                    List<OrderLine> lines = lineRepository.findByOrderPlanId(plan.getId());

                    List<OrderPlanDto.HistoryLine> historyLines = lines.stream().map(line -> {
                        Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
                        Item item = pkg != null ? itemRepository.findById(pkg.getItemId()).orElse(null) : null;
                        BigDecimal price = supplierItemRepository
                                .findBySupplierIdAndPackagingId(plan.getSupplierId(), line.getPackagingId())
                                .map(SupplierItem::getPrice)
                                .orElse(BigDecimal.ZERO);

                        return OrderPlanDto.HistoryLine.builder()
                                .packagingId(line.getPackagingId())
                                .packName(pkg != null ? pkg.getPackName() : "Unknown")
                                .itemId(pkg != null ? pkg.getItemId() : null)
                                .itemName(item != null ? item.getName() : "Unknown")
                                .packQty(line.getPackQty())
                                .unitsPerPack(pkg != null ? pkg.getUnitsPerPack() : BigDecimal.ZERO)
                                .price(price)
                                .build();
                    }).toList();

                    return OrderPlanDto.HistoryResponse.builder()
                            .id(plan.getId())
                            .storeId(plan.getStoreId())
                            .supplierId(plan.getSupplierId())
                            .supplierName(supplier != null ? supplier.getName() : "Unknown")
                            .status(plan.getStatus().name())
                            .lines(historyLines)
                            .createdAt(plan.getCreatedAt())
                            .build();
                }).toList();
    }

    private OrderPlan getOrThrow(Long id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", id));
    }

    private OrderPlanDto.Response toResponse(OrderPlan p) {
        return OrderPlanDto.Response.builder()
                .id(p.getId())
                .storeId(p.getStoreId())
                .supplierId(p.getSupplierId())
                .status(p.getStatus().name())
                .recommendedByAi(p.getRecommendedByAi())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
