package com.coffee.domain.ordering.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.dto.FulfillmentDto;
import com.coffee.domain.ordering.dto.OrderPlanDto;
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FulfillmentService {

    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final StoreRepository storeRepository;
    private final SupplierRepository supplierRepository;
    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;

    public FulfillmentDto.AdminPlanListResponse getAdminPlans(String status, String fulfillmentStatus) {
        List<OrderPlan> plans;

        if (status != null && fulfillmentStatus != null) {
            plans = planRepository.findByStatusAndFulfillmentStatusOrderByCreatedAtDesc(
                    OrderStatus.valueOf(status), fulfillmentStatus);
        } else if (status != null) {
            plans = planRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.valueOf(status));
        } else if (fulfillmentStatus != null) {
            plans = planRepository.findByFulfillmentStatusOrderByCreatedAtDesc(fulfillmentStatus);
        } else {
            plans = planRepository.findAllByOrderByCreatedAtDesc();
        }

        List<FulfillmentDto.AdminPlanResponse> responses = plans.stream()
                .map(this::toAdminResponse)
                .toList();

        return FulfillmentDto.AdminPlanListResponse.builder()
                .plans(responses)
                .totalCount(responses.size())
                .build();
    }

    public FulfillmentDto.AdminPlanResponse getAdminPlan(Long planId) {
        OrderPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", planId));
        return toAdminResponse(plan);
    }

    @Transactional
    public FulfillmentDto.AdminPlanResponse updateFulfillmentStatus(Long planId, FulfillmentDto.UpdateRequest request) {
        OrderPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", planId));

        String newStatus = request.getFulfillmentStatus();
        List<String> validStatuses = List.of("PENDING", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED");
        if (!validStatuses.contains(newStatus)) {
            throw new BusinessException("Invalid fulfillment status: " + newStatus, HttpStatus.BAD_REQUEST);
        }

        plan.setFulfillmentStatus(newStatus);
        planRepository.save(plan);

        return toAdminResponse(plan);
    }

    private FulfillmentDto.AdminPlanResponse toAdminResponse(OrderPlan plan) {
        Store store = storeRepository.findById(plan.getStoreId()).orElse(null);
        Supplier supplier = supplierRepository.findById(plan.getSupplierId()).orElse(null);

        List<OrderLine> orderLines = lineRepository.findByOrderPlanId(plan.getId());
        List<OrderPlanDto.HistoryLine> lines = orderLines.stream().map(line -> {
            Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
            String itemName = null;
            Long itemId = null;
            BigDecimal price = BigDecimal.ZERO;
            if (pkg != null) {
                itemId = pkg.getItemId();
                itemName = itemRepository.findById(pkg.getItemId())
                        .map(com.coffee.domain.master.entity.Item::getName).orElse(null);
            }
            return OrderPlanDto.HistoryLine.builder()
                    .packagingId(line.getPackagingId())
                    .packName(pkg != null ? pkg.getPackName() : "Unknown")
                    .itemId(itemId)
                    .itemName(itemName)
                    .packQty(line.getPackQty())
                    .unitsPerPack(pkg != null ? pkg.getUnitsPerPack() : BigDecimal.ZERO)
                    .price(price)
                    .build();
        }).toList();

        return FulfillmentDto.AdminPlanResponse.builder()
                .id(plan.getId())
                .storeId(plan.getStoreId())
                .storeName(store != null ? store.getName() : null)
                .supplierId(plan.getSupplierId())
                .supplierName(supplier != null ? supplier.getName() : null)
                .status(plan.getStatus().name())
                .fulfillmentStatus(plan.getFulfillmentStatus())
                .deliveryDate(plan.getDeliveryDate())
                .cutoffAt(plan.getCutoffAt())
                .totalAmount(plan.getTotalAmount())
                .vatAmount(plan.getVatAmount())
                .lines(lines)
                .confirmedAt(plan.getConfirmedAt())
                .dispatchedAt(plan.getDispatchedAt())
                .createdAt(plan.getCreatedAt())
                .build();
    }
}
