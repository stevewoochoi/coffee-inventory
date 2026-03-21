package com.coffee.domain.receiving.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import com.coffee.domain.inventory.dto.QuickReceiveDto;
import com.coffee.domain.receiving.dto.DeliveryDto;
import com.coffee.domain.receiving.dto.DeliveryScanDto;
import com.coffee.domain.receiving.dto.OrderReceivingDto;
import com.coffee.domain.receiving.entity.Delivery;
import com.coffee.domain.receiving.entity.DeliveryScan;
import com.coffee.domain.receiving.entity.DeliveryStatus;
import com.coffee.domain.receiving.repository.DeliveryRepository;
import com.coffee.domain.receiving.repository.DeliveryScanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryScanRepository scanRepository;
    private final PackagingRepository packagingRepository;
    private final InventoryService inventoryService;
    private final OrderPlanRepository orderPlanRepository;
    private final OrderLineRepository orderLineRepository;
    private final SupplierRepository supplierRepository;
    private final ItemRepository itemRepository;

    public List<DeliveryDto.Response> findByStoreId(Long storeId) {
        return deliveryRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<DeliveryDto.Response> findHistory(Long storeId, java.time.LocalDate from, java.time.LocalDate to, String status) {
        java.time.LocalDateTime fromDt = from.atStartOfDay();
        java.time.LocalDateTime toDt = to.plusDays(1).atStartOfDay();

        List<Delivery> deliveries;
        if (status != null && !status.isEmpty()) {
            DeliveryStatus deliveryStatus = DeliveryStatus.valueOf(status);
            deliveries = deliveryRepository.findByStoreIdAndStatusAndCreatedAtBetweenOrderByCreatedAtDesc(
                    storeId, deliveryStatus, fromDt, toDt);
        } else {
            deliveries = deliveryRepository.findByStoreIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                    storeId, fromDt, toDt);
        }

        return deliveries.stream().map(this::toResponse).toList();
    }

    public DeliveryDto.Response findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public DeliveryDto.Response create(DeliveryDto.CreateRequest request) {
        Delivery delivery = Delivery.builder()
                .storeId(request.getStoreId())
                .supplierId(request.getSupplierId())
                .expectedAt(request.getExpectedAt())
                .build();
        return toResponse(deliveryRepository.save(delivery));
    }

    @Transactional
    public DeliveryScanDto.Response addScan(Long deliveryId, DeliveryScanDto.Request request) {
        Delivery delivery = getOrThrow(deliveryId);
        if (delivery.getStatus() == DeliveryStatus.COMPLETED) {
            throw new BusinessException("이미 완료된 입고 건입니다", HttpStatus.BAD_REQUEST);
        }
        if (delivery.getStatus() == DeliveryStatus.CANCELLED) {
            throw new BusinessException("취소된 입고 건에는 스캔할 수 없습니다", HttpStatus.BAD_REQUEST);
        }

        if (delivery.getStatus() == DeliveryStatus.PENDING) {
            delivery.setStatus(DeliveryStatus.IN_PROGRESS);
            deliveryRepository.save(delivery);
        }

        DeliveryScan scan = DeliveryScan.builder()
                .deliveryId(deliveryId)
                .packagingId(request.getPackagingId())
                .lotNo(request.getLotNo())
                .expDate(request.getExpDate())
                .packCountScanned(request.getPackCountScanned() != null ? request.getPackCountScanned() : 1)
                .build();

        return toScanResponse(scanRepository.save(scan));
    }

    public List<DeliveryScanDto.Response> getScans(Long deliveryId) {
        return scanRepository.findByDeliveryId(deliveryId).stream()
                .map(this::toScanResponse)
                .toList();
    }

    @Transactional
    public DeliveryDto.Response confirm(Long deliveryId, Long userId) {
        Delivery delivery = getOrThrow(deliveryId);
        if (delivery.getStatus() == DeliveryStatus.COMPLETED) {
            throw new BusinessException("이미 완료된 입고 건입니다", HttpStatus.BAD_REQUEST);
        }

        List<DeliveryScan> scans = scanRepository.findByDeliveryId(deliveryId);
        if (scans.isEmpty()) {
            throw new BusinessException("No scans found for this delivery", HttpStatus.BAD_REQUEST);
        }

        for (DeliveryScan scan : scans) {
            Packaging packaging = packagingRepository.findById(scan.getPackagingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Packaging", scan.getPackagingId()));

            BigDecimal totalQty = packaging.getUnitsPerPack()
                    .multiply(new BigDecimal(scan.getPackCountScanned()));

            inventoryService.recordStockChange(
                    delivery.getStoreId(),
                    packaging.getItemId(),
                    totalQty,
                    LedgerType.RECEIVE,
                    "DELIVERY",
                    deliveryId,
                    "Delivery #" + deliveryId,
                    userId,
                    scan.getExpDate(),
                    scan.getLotNo()
            );
        }

        delivery.setStatus(DeliveryStatus.COMPLETED);
        return toResponse(deliveryRepository.save(delivery));
    }

    public List<OrderReceivingDto.PendingOrderResponse> getPendingOrders(Long storeId) {
        List<OrderPlan> plans = orderPlanRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .filter(p -> p.getStatus() == OrderStatus.CONFIRMED || p.getStatus() == OrderStatus.DISPATCHED
                        || p.getStatus() == OrderStatus.PARTIALLY_RECEIVED)
                .toList();

        return plans.stream().map(plan -> {
            Supplier supplier = supplierRepository.findById(plan.getSupplierId()).orElse(null);
            List<OrderLine> lines = orderLineRepository.findByOrderPlanId(plan.getId());
            List<OrderReceivingDto.OrderLineDetail> lineDetails = lines.stream()
                    .map(line -> {
                        Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
                        Item item = pkg != null ? itemRepository.findById(pkg.getItemId()).orElse(null) : null;
                        return OrderReceivingDto.OrderLineDetail.builder()
                                .packagingId(line.getPackagingId())
                                .packName(pkg != null ? pkg.getPackName() : "Unknown")
                                .itemName(item != null ? item.getName() : "Unknown")
                                .orderedPackQty(line.getPackQty())
                                .build();
                    }).toList();

            return OrderReceivingDto.PendingOrderResponse.builder()
                    .orderPlanId(plan.getId())
                    .supplierId(plan.getSupplierId())
                    .supplierName(supplier != null ? supplier.getName() : "Unknown")
                    .status(plan.getStatus().name())
                    .lines(lineDetails)
                    .createdAt(plan.getCreatedAt())
                    .build();
        }).toList();
    }

    @Transactional
    public DeliveryDto.Response receiveFromOrder(Long orderPlanId, OrderReceivingDto.ReceiveRequest request, Long userId) {
        OrderPlan plan = orderPlanRepository.findById(orderPlanId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", orderPlanId));

        if (plan.getStatus() != OrderStatus.CONFIRMED && plan.getStatus() != OrderStatus.DISPATCHED
                && plan.getStatus() != OrderStatus.PARTIALLY_RECEIVED) {
            throw new BusinessException("Order is not in a receivable status", HttpStatus.BAD_REQUEST);
        }

        // Create delivery linked to order plan
        Delivery delivery = Delivery.builder()
                .storeId(plan.getStoreId())
                .supplierId(plan.getSupplierId())
                .orderPlanId(orderPlanId)
                .status(DeliveryStatus.COMPLETED)
                .build();
        deliveryRepository.save(delivery);

        // Process each receive line
        for (OrderReceivingDto.ReceiveLine line : request.getLines()) {
            Packaging packaging = packagingRepository.findById(line.getPackagingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Packaging", line.getPackagingId()));

            BigDecimal totalQty = packaging.getUnitsPerPack().multiply(new BigDecimal(line.getPackQty()));
            inventoryService.recordStockChange(
                    plan.getStoreId(),
                    packaging.getItemId(),
                    totalQty,
                    LedgerType.RECEIVE,
                    "ORDER_DELIVERY",
                    delivery.getId(),
                    "From order #" + orderPlanId,
                    userId,
                    line.getExpDate(),
                    line.getLotNo()
            );
        }

        // Compare received vs ordered to determine status
        List<OrderLine> orderedLines = orderLineRepository.findByOrderPlanId(orderPlanId);
        Map<Long, Integer> orderedQtyMap = new java.util.HashMap<>();
        for (OrderLine ol : orderedLines) {
            orderedQtyMap.merge(ol.getPackagingId(), ol.getPackQty(), Integer::sum);
        }

        Map<Long, Integer> receivedQtyMap = new java.util.HashMap<>();
        for (OrderReceivingDto.ReceiveLine rl : request.getLines()) {
            receivedQtyMap.merge(rl.getPackagingId(), rl.getPackQty(), Integer::sum);
        }

        boolean fullReceive = orderedQtyMap.entrySet().stream()
                .allMatch(e -> receivedQtyMap.getOrDefault(e.getKey(), 0) >= e.getValue());

        plan.setStatus(fullReceive ? OrderStatus.DELIVERED : OrderStatus.PARTIALLY_RECEIVED);
        if (fullReceive) {
            plan.setReceivedAt(java.time.LocalDateTime.now());
        }
        orderPlanRepository.save(plan);

        return toResponse(delivery);
    }

    @Transactional
    public DeliveryDto.Response quickConfirm(Long deliveryId, QuickReceiveDto.QuickConfirmRequest request) {
        Delivery delivery = getOrThrow(deliveryId);
        if (delivery.getStatus() == DeliveryStatus.COMPLETED) {
            throw new BusinessException("이미 완료된 입고 건입니다", HttpStatus.BAD_REQUEST);
        }
        if (delivery.getStatus() == DeliveryStatus.CANCELLED) {
            throw new BusinessException("취소된 입고 건에는 입고할 수 없습니다", HttpStatus.BAD_REQUEST);
        }

        for (QuickReceiveDto.ReceiveLine line : request.getLines()) {
            Packaging packaging = packagingRepository.findById(line.getPackagingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Packaging", line.getPackagingId()));

            BigDecimal totalQty = packaging.getUnitsPerPack()
                    .multiply(new BigDecimal(line.getReceivedQty()));

            inventoryService.recordStockChange(
                    delivery.getStoreId(),
                    packaging.getItemId(),
                    totalQty,
                    LedgerType.RECEIVE,
                    "DELIVERY",
                    deliveryId,
                    request.getNote() != null ? request.getNote() : "Quick confirm #" + deliveryId,
                    null,
                    line.getExpDate(),
                    null
            );
        }

        delivery.setStatus(DeliveryStatus.COMPLETED);
        deliveryRepository.save(delivery);

        // If delivery is linked to an order plan, update order plan status
        if (delivery.getOrderPlanId() != null) {
            orderPlanRepository.findById(delivery.getOrderPlanId()).ifPresent(plan -> {
                plan.setStatus(OrderStatus.DELIVERED);
                plan.setReceivedAt(java.time.LocalDateTime.now());
                orderPlanRepository.save(plan);
            });
        }

        return toResponse(delivery);
    }

    public List<DeliveryDto.Response> getPendingDeliveries(Long storeId) {
        return deliveryRepository.findByStoreIdAndStatusIn(
                storeId, List.of(DeliveryStatus.PENDING, DeliveryStatus.IN_PROGRESS)
        ).stream().map(this::toResponse).toList();
    }

    private Delivery getOrThrow(Long id) {
        return deliveryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery", id));
    }

    private DeliveryDto.Response toResponse(Delivery d) {
        return DeliveryDto.Response.builder()
                .id(d.getId())
                .storeId(d.getStoreId())
                .supplierId(d.getSupplierId())
                .expectedAt(d.getExpectedAt())
                .status(d.getStatus().name())
                .createdAt(d.getCreatedAt())
                .build();
    }

    private DeliveryScanDto.Response toScanResponse(DeliveryScan s) {
        return DeliveryScanDto.Response.builder()
                .id(s.getId())
                .deliveryId(s.getDeliveryId())
                .packagingId(s.getPackagingId())
                .lotNo(s.getLotNo())
                .expDate(s.getExpDate())
                .packCountScanned(s.getPackCountScanned())
                .scannedAt(s.getScannedAt())
                .build();
    }
}
