package com.coffee.domain.receiving.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.receiving.dto.DeliveryDto;
import com.coffee.domain.receiving.dto.DeliveryScanDto;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryScanRepository scanRepository;
    private final PackagingRepository packagingRepository;
    private final InventoryService inventoryService;

    public List<DeliveryDto.Response> findByStoreId(Long storeId) {
        return deliveryRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::toResponse)
                .toList();
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
        if (delivery.getStatus() == DeliveryStatus.COMPLETED || delivery.getStatus() == DeliveryStatus.CANCELLED) {
            throw new BusinessException("Cannot scan for completed or cancelled delivery", HttpStatus.BAD_REQUEST);
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
            throw new BusinessException("Delivery already confirmed", HttpStatus.BAD_REQUEST);
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
