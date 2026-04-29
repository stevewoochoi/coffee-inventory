package com.coffee.domain.ordering.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.ordering.dto.SupplierPortalDto;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.*;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplierPortalService {

    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final SupplierOrderNotificationRepository notificationRepository;
    private final StoreRepository storeRepository;
    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;

    public List<SupplierPortalDto.OrderSummary> getSupplierOrders(Long supplierId, String status) {
        List<OrderPlan> plans;
        if (status != null && !status.isEmpty()) {
            OrderStatus orderStatus = OrderStatus.valueOf(status);
            plans = planRepository.findBySupplierIdAndStatusOrderByCreatedAtDesc(supplierId, orderStatus);
        } else {
            plans = planRepository.findByFulfillmentStatusOrderByCreatedAtDesc("PENDING");
            plans = plans.stream().filter(p -> p.getSupplierId().equals(supplierId)).toList();
            // Fallback: get dispatched orders
            List<OrderPlan> dispatched = planRepository.findBySupplierIdAndStatusOrderByCreatedAtDesc(supplierId, OrderStatus.DISPATCHED);
            plans = dispatched;
        }

        return plans.stream().map(p -> {
            Store store = storeRepository.findById(p.getStoreId()).orElse(null);
            List<OrderLine> orderLines = lineRepository.findByOrderPlanId(p.getId());
            String currency = orderLines.stream()
                    .findFirst()
                    .flatMap(l -> packagingRepository.findById(l.getPackagingId()))
                    .flatMap(pkg -> itemRepository.findById(pkg.getItemId()))
                    .map(Item::getCurrency)
                    .orElse("JPY");
            return SupplierPortalDto.OrderSummary.builder()
                    .orderPlanId(p.getId())
                    .storeId(p.getStoreId())
                    .storeName(store != null ? store.getName() : "Unknown")
                    .deliveryDate(p.getDeliveryDate())
                    .status(p.getStatus().name())
                    .fulfillmentStatus(p.getFulfillmentStatus())
                    .totalAmount(p.getTotalAmount())
                    .currency(currency)
                    .lineCount(orderLines.size())
                    .createdAt(p.getCreatedAt())
                    .build();
        }).toList();
    }

    @Transactional
    public SupplierPortalDto.NotificationResponse notify(Long orderPlanId, Long supplierId,
                                                          String type, String message, Long notifiedBy) {
        OrderPlan plan = planRepository.findById(orderPlanId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", orderPlanId));

        SupplierOrderNotification notification = SupplierOrderNotification.builder()
                .orderPlanId(orderPlanId)
                .supplierId(supplierId)
                .notificationType(type)
                .message(message)
                .notifiedBy(notifiedBy)
                .build();
        notificationRepository.save(notification);

        // Auto-update fulfillment status
        switch (type) {
            case "ORDER_RECEIVED", "SHIPMENT_READY" -> plan.setFulfillmentStatus("PREPARING");
            case "SHIPPED" -> plan.setFulfillmentStatus("SHIPPING");
        }
        planRepository.save(plan);

        return SupplierPortalDto.NotificationResponse.builder()
                .id(notification.getId())
                .orderPlanId(orderPlanId)
                .notificationType(type)
                .message(message)
                .createdAt(notification.getCreatedAt())
                .build();
    }

    public List<SupplierPortalDto.NotificationResponse> getNotifications(Long orderPlanId) {
        return notificationRepository.findByOrderPlanIdOrderByCreatedAtDesc(orderPlanId).stream()
                .map(n -> SupplierPortalDto.NotificationResponse.builder()
                        .id(n.getId())
                        .orderPlanId(n.getOrderPlanId())
                        .notificationType(n.getNotificationType())
                        .message(n.getMessage())
                        .createdAt(n.getCreatedAt())
                        .build())
                .toList();
    }
}
