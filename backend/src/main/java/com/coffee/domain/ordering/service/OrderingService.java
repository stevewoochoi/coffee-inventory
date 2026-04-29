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
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderingService {

    private static final BigDecimal VAT_RATE = new BigDecimal("0.10");

    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final OrderDispatchLogRepository dispatchLogRepository;
    private final SupplierRepository supplierRepository;
    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final StoreRepository storeRepository;
    private final DeliveryPolicyService policyService;

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
        Store store = storeRepository.findById(plan.getStoreId()).orElse(null);
        List<OrderLine> lines = lineRepository.findByOrderPlanIdAndIsActiveTrue(plan.getId());

        java.util.concurrent.atomic.AtomicReference<String> orderCurrencyRef = new java.util.concurrent.atomic.AtomicReference<>("JPY");
        List<OrderPlanDto.HistoryLine> historyLines = lines.stream().map(line -> {
            Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
            Item item = pkg != null ? itemRepository.findById(pkg.getItemId()).orElse(null) : null;
            // Price priority: order_line.unit_price (snapshot) -> supplier_item.price -> item.price * unitsPerPack
            BigDecimal price = line.getUnitPrice();
            if (price == null) {
                price = supplierItemRepository
                        .findBySupplierIdAndPackagingId(plan.getSupplierId(), line.getPackagingId())
                        .map(SupplierItem::getPrice)
                        .orElse(null);
            }
            if (price == null && item != null && item.getPrice() != null && pkg != null) {
                BigDecimal upp = pkg.getUnitsPerPack() != null ? pkg.getUnitsPerPack() : BigDecimal.ONE;
                price = item.getPrice().multiply(upp);
            }
            if (price == null) price = BigDecimal.ZERO;
            String lineCurrency = item != null && item.getCurrency() != null ? item.getCurrency() : "JPY";
            orderCurrencyRef.set(lineCurrency);

            return OrderPlanDto.HistoryLine.builder()
                    .packagingId(line.getPackagingId())
                    .packName(pkg != null ? pkg.getPackName() : "Unknown")
                    .itemId(pkg != null ? pkg.getItemId() : null)
                    .itemName(item != null ? item.getName() : "Unknown")
                    .packQty(line.getPackQty())
                    .unitsPerPack(pkg != null ? pkg.getUnitsPerPack() : BigDecimal.ZERO)
                    .price(price)
                    .currency(lineCurrency)
                    .build();
        }).toList();

        return OrderPlanDto.DetailedResponse.builder()
                .id(plan.getId())
                .storeId(plan.getStoreId())
                .storeName(store != null ? store.getName() : "Unknown")
                .supplierId(plan.getSupplierId())
                .supplierName(supplier != null ? supplier.getName() : "Unknown")
                .status(plan.getStatus().name())
                .fulfillmentStatus(plan.getFulfillmentStatus())
                .deliveryDate(plan.getDeliveryDate())
                .cutoffAt(plan.getCutoffAt())
                .totalAmount(plan.getTotalAmount())
                .vatAmount(plan.getVatAmount())
                .currency(orderCurrencyRef.get())
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
        // FIX-07: Validate supplier exists
        supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", request.getSupplierId()));

        OrderPlan plan = OrderPlan.builder()
                .storeId(request.getStoreId())
                .supplierId(request.getSupplierId())
                .build();
        planRepository.save(plan);

        BigDecimal totalAmount = BigDecimal.ZERO;

        if (request.getLines() != null) {
            for (OrderPlanDto.OrderLineDto line : request.getLines()) {
                // FIX-02: Validate supplier-item mapping
                SupplierItem supplierItem = supplierItemRepository
                        .findBySupplierIdAndPackagingId(request.getSupplierId(), line.getPackagingId())
                        .orElseThrow(() -> new BusinessException(
                                "해당 공급사에 등록되지 않은 품목입니다: packagingId=" + line.getPackagingId(),
                                HttpStatus.BAD_REQUEST));

                // FIX-06: Validate maxOrderQty
                Packaging packaging = packagingRepository.findById(line.getPackagingId())
                        .orElseThrow(() -> new ResourceNotFoundException("Packaging", line.getPackagingId()));
                Item item = itemRepository.findById(packaging.getItemId())
                        .orElseThrow(() -> new ResourceNotFoundException("Item", packaging.getItemId()));
                if (item.getMaxOrderQty() != null && line.getPackQty() > item.getMaxOrderQty()) {
                    throw new BusinessException(
                            "최대 발주 수량(" + item.getMaxOrderQty() + ")을 초과했습니다: " + item.getName(),
                            HttpStatus.BAD_REQUEST);
                }

                BigDecimal unitPrice = supplierItem.getPrice() != null ? supplierItem.getPrice() : BigDecimal.ZERO;
                lineRepository.save(OrderLine.builder()
                        .orderPlanId(plan.getId())
                        .packagingId(line.getPackagingId())
                        .packQty(line.getPackQty())
                        .unitPrice(unitPrice)
                        .build());

                // FIX-03: Calculate amount
                totalAmount = totalAmount.add(unitPrice.multiply(BigDecimal.valueOf(line.getPackQty())));
            }
        }

        // FIX-03: Set amounts
        BigDecimal vatAmount = totalAmount.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP);
        plan.setTotalAmount(totalAmount);
        plan.setVatAmount(vatAmount);
        planRepository.save(plan);

        return toResponse(plan);
    }

    @Transactional
    public OrderPlanDto.Response confirm(Long id) {
        OrderPlan plan = getOrThrow(id);
        if (plan.getStatus() != OrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT orders can be confirmed", HttpStatus.BAD_REQUEST);
        }
        plan.setStatus(OrderStatus.CONFIRMED);
        plan.setConfirmedAt(LocalDateTime.now());

        // FIX-04: Calculate cutoffAt if not set
        if (plan.getDeliveryDate() != null) {
            DeliveryPolicy policy = policyService.getStorePolicy(plan.getStoreId());
            if (policy != null) {
                plan.setCutoffAt(policyService.calculateCutoff(plan.getDeliveryDate(), policy));
            }
        }
        if (plan.getCutoffAt() == null) {
            plan.setCutoffAt(LocalDateTime.now().plusHours(24));
        }

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
                        BigDecimal price = line.getUnitPrice();
                        if (price == null) {
                            price = supplierItemRepository
                                    .findBySupplierIdAndPackagingId(plan.getSupplierId(), line.getPackagingId())
                                    .map(SupplierItem::getPrice)
                                    .orElse(null);
                        }
                        if (price == null && item != null && item.getPrice() != null && pkg != null) {
                            BigDecimal upp = pkg.getUnitsPerPack() != null ? pkg.getUnitsPerPack() : BigDecimal.ONE;
                            price = item.getPrice().multiply(upp);
                        }
                        if (price == null) price = BigDecimal.ZERO;

                        return OrderPlanDto.HistoryLine.builder()
                                .packagingId(line.getPackagingId())
                                .packName(pkg != null ? pkg.getPackName() : "Unknown")
                                .itemId(pkg != null ? pkg.getItemId() : null)
                                .itemName(item != null ? item.getName() : "Unknown")
                                .packQty(line.getPackQty())
                                .unitsPerPack(pkg != null ? pkg.getUnitsPerPack() : BigDecimal.ZERO)
                                .price(price)
                                .currency(item != null && item.getCurrency() != null ? item.getCurrency() : "JPY")
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

    public List<OrderPlanDto.DetailedResponse> findAllByBrandId(Long brandId, Long supplierId, Long storeId, String status) {
        List<Long> storeIds;
        if (storeId != null) {
            storeIds = List.of(storeId);
        } else {
            storeIds = storeRepository.findByBrandId(brandId).stream().map(Store::getId).toList();
        }
        if (storeIds.isEmpty()) {
            return List.of();
        }

        List<OrderPlan> plans;
        if (supplierId != null) {
            plans = planRepository.findBySupplierIdAndStoreIdIn(supplierId, storeIds);
        } else {
            plans = planRepository.findByStoreIdIn(storeIds);
        }

        if (status != null && !status.isEmpty()) {
            OrderStatus orderStatus = OrderStatus.valueOf(status);
            plans = plans.stream().filter(p -> p.getStatus() == orderStatus).toList();
        }

        return plans.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toDetailedResponse)
                .toList();
    }

    public List<OrderPlanDto.SummaryResponse> getSupplierSummary(Long brandId) {
        List<Store> stores = storeRepository.findByBrandId(brandId);
        List<Long> storeIds = stores.stream().map(Store::getId).toList();
        if (storeIds.isEmpty()) {
            return List.of();
        }

        List<OrderPlan> plans = planRepository.findByStoreIdIn(storeIds);

        Map<Long, List<OrderPlan>> grouped = plans.stream()
                .collect(Collectors.groupingBy(OrderPlan::getSupplierId));

        return grouped.entrySet().stream().map(entry -> {
            Long sid = entry.getKey();
            List<OrderPlan> supplierPlans = entry.getValue();
            Supplier supplier = supplierRepository.findById(sid).orElse(null);
            BigDecimal total = supplierPlans.stream()
                    .map(OrderPlan::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            String currency = supplierPlans.stream()
                    .flatMap(p -> lineRepository.findByOrderPlanIdAndIsActiveTrue(p.getId()).stream())
                    .findFirst()
                    .flatMap(l -> packagingRepository.findById(l.getPackagingId()))
                    .flatMap(pkg -> itemRepository.findById(pkg.getItemId()))
                    .map(Item::getCurrency)
                    .orElse("JPY");

            return OrderPlanDto.SummaryResponse.builder()
                    .supplierId(sid)
                    .supplierName(supplier != null ? supplier.getName() : "Unknown")
                    .orderCount((long) supplierPlans.size())
                    .totalAmount(total)
                    .currency(currency)
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
