package com.coffee.domain.ordering.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.ordering.dto.OrderPlanDto;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrderConfirmService {

    private static final BigDecimal VAT_RATE = new BigDecimal("0.10");

    private final OrderCartRepository cartRepository;
    private final OrderCartItemRepository cartItemRepository;
    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final DeliveryPolicyService policyService;
    private final SupplierItemRepository supplierItemRepository;
    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;

    @Transactional
    public OrderPlanDto.ConfirmCartResponse confirmCart(Long cartId) {
        OrderCart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", cartId));

        if (!"ACTIVE".equals(cart.getStatus())) {
            throw new BusinessException("Cart is not in ACTIVE status", HttpStatus.BAD_REQUEST);
        }

        List<OrderCartItem> items = cartItemRepository.findByCartId(cartId);
        if (items.isEmpty()) {
            throw new BusinessException("Cart is empty", HttpStatus.BAD_REQUEST);
        }

        // Get delivery policy for cutoff calculation
        DeliveryPolicy policy = policyService.getStorePolicy(cart.getStoreId());

        // Group items by supplier
        Map<Long, List<OrderCartItem>> bySupplier = items.stream()
                .collect(Collectors.groupingBy(OrderCartItem::getSupplierId));

        List<Long> planIds = new ArrayList<>();

        for (Map.Entry<Long, List<OrderCartItem>> entry : bySupplier.entrySet()) {
            // Calculate amounts
            BigDecimal totalAmount = BigDecimal.ZERO;
            for (OrderCartItem ci : entry.getValue()) {
                BigDecimal price = ci.getUnitPrice() != null ? ci.getUnitPrice() : BigDecimal.ZERO;
                totalAmount = totalAmount.add(price.multiply(BigDecimal.valueOf(ci.getPackQty())));
            }
            BigDecimal vatAmount = totalAmount.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP);

            // Calculate cutoff time
            LocalDateTime cutoffAt = null;
            if (cart.getDeliveryDate() != null && policy != null) {
                cutoffAt = policyService.calculateCutoff(cart.getDeliveryDate(), policy);
            }

            // Create OrderPlan
            OrderPlan plan = OrderPlan.builder()
                    .storeId(cart.getStoreId())
                    .supplierId(entry.getKey())
                    .status(OrderStatus.CONFIRMED)
                    .deliveryDate(cart.getDeliveryDate())
                    .cutoffAt(cutoffAt)
                    .deliveryPolicyId(cart.getDeliveryPolicyId())
                    .totalAmount(totalAmount)
                    .vatAmount(vatAmount)
                    .fulfillmentStatus("PENDING")
                    .confirmedAt(LocalDateTime.now())
                    .build();
            planRepository.save(plan);

            // Create OrderLines (snapshot unit price from cart item, fallback to supplier_item)
            for (OrderCartItem ci : entry.getValue()) {
                BigDecimal snapPrice = ci.getUnitPrice();
                if (snapPrice == null) {
                    snapPrice = supplierItemRepository
                            .findBySupplierIdAndPackagingId(ci.getSupplierId(), ci.getPackagingId())
                            .map(SupplierItem::getPrice)
                            .orElse(BigDecimal.ZERO);
                }
                lineRepository.save(OrderLine.builder()
                        .orderPlanId(plan.getId())
                        .packagingId(ci.getPackagingId())
                        .packQty(ci.getPackQty())
                        .unitPrice(snapPrice)
                        .build());
            }

            planIds.add(plan.getId());
        }

        // Update cart status
        cart.setStatus("SUBMITTED");
        cartRepository.save(cart);

        return OrderPlanDto.ConfirmCartResponse.builder()
                .orderPlanIds(planIds)
                .orderCount(planIds.size())
                .totalAmount(planIds.stream()
                        .map(id -> planRepository.findById(id).map(OrderPlan::getTotalAmount).orElse(BigDecimal.ZERO))
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .build();
    }

    @Transactional
    public void cancelOrder(Long planId) {
        OrderPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", planId));

        if (plan.getStatus() != OrderStatus.CONFIRMED && plan.getStatus() != OrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT or CONFIRMED orders can be cancelled", HttpStatus.BAD_REQUEST);
        }

        // FIX-04: Check cutoff - CONFIRMED orders with null cutoff cannot be cancelled
        if (plan.getStatus() == OrderStatus.CONFIRMED) {
            if (plan.getCutoffAt() == null) {
                throw new BusinessException("Cannot cancel order: cutoff time is not set", HttpStatus.BAD_REQUEST);
            }
            if (LocalDateTime.now().isAfter(plan.getCutoffAt())) {
                throw new BusinessException("Cannot cancel order after cutoff time", HttpStatus.BAD_REQUEST);
            }
        }

        plan.setStatus(OrderStatus.CANCELLED);
        planRepository.save(plan);
    }

    @Transactional
    public OrderPlanDto.Response modifyOrder(Long planId, OrderPlanDto.ModifyRequest request) {
        OrderPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", planId));

        if (plan.getStatus() != OrderStatus.CONFIRMED && plan.getStatus() != OrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT or CONFIRMED orders can be modified", HttpStatus.BAD_REQUEST);
        }

        // Check cutoff
        if (plan.getCutoffAt() != null && LocalDateTime.now().isAfter(plan.getCutoffAt())) {
            throw new BusinessException("Cannot modify order after cutoff time", HttpStatus.BAD_REQUEST);
        }

        // Soft-delete existing lines for audit trail, then create new version
        List<OrderLine> existingLines = lineRepository.findByOrderPlanIdAndIsActiveTrue(planId);
        int nextVersion = existingLines.stream()
                .mapToInt(l -> l.getModificationVersion() != null ? l.getModificationVersion() : 0)
                .max().orElse(0) + 1;
        for (OrderLine line : existingLines) {
            line.setIsActive(false);
        }
        lineRepository.saveAll(existingLines);

        BigDecimal totalAmount = BigDecimal.ZERO;

        if (request.getLines() != null) {
            for (OrderPlanDto.OrderLineDto lineDto : request.getLines()) {
                BigDecimal linePrice = supplierItemRepository
                        .findBySupplierIdAndPackagingId(plan.getSupplierId(), lineDto.getPackagingId())
                        .map(SupplierItem::getPrice)
                        .orElse(BigDecimal.ZERO);

                // FIX-06: Validate maxOrderQty
                Packaging packaging = packagingRepository.findById(lineDto.getPackagingId())
                        .orElseThrow(() -> new ResourceNotFoundException("Packaging", lineDto.getPackagingId()));
                Item item = itemRepository.findById(packaging.getItemId())
                        .orElseThrow(() -> new ResourceNotFoundException("Item", packaging.getItemId()));
                if (item.getMaxOrderQty() != null && lineDto.getPackQty() > item.getMaxOrderQty()) {
                    throw new BusinessException(
                            "최대 발주 수량(" + item.getMaxOrderQty() + ")을 초과했습니다: " + item.getName(),
                            HttpStatus.BAD_REQUEST);
                }

                lineRepository.save(OrderLine.builder()
                        .orderPlanId(planId)
                        .packagingId(lineDto.getPackagingId())
                        .packQty(lineDto.getPackQty())
                        .unitPrice(linePrice)
                        .modificationVersion(nextVersion)
                        .build());

                totalAmount = totalAmount.add(linePrice.multiply(BigDecimal.valueOf(lineDto.getPackQty())));
            }
        }

        BigDecimal vatAmount = totalAmount.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP);
        plan.setTotalAmount(totalAmount);
        plan.setVatAmount(vatAmount);
        planRepository.save(plan);

        return toResponse(plan);
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void autoCutoffConfirm() {
        log.info("Running cutoff auto-confirm scheduler");
        LocalDateTime now = LocalDateTime.now();

        List<OrderPlan> confirmedPlans = planRepository.findByStatusAndCutoffAtBefore(
                OrderStatus.CONFIRMED, now);

        for (OrderPlan plan : confirmedPlans) {
            plan.setStatus(OrderStatus.DISPATCHED);
            plan.setAutoConfirmedAt(now);
            plan.setDispatchedAt(now);
            planRepository.save(plan);
            log.info("Auto-dispatched order plan #{}", plan.getId());
        }

        log.info("Auto-confirm completed: {} orders dispatched", confirmedPlans.size());
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
