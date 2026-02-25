package com.coffee.domain.inventory.service;

import com.coffee.domain.inventory.entity.AlertStatus;
import com.coffee.domain.inventory.entity.ItemExpiryAlert;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.repository.ItemExpiryAlertRepository;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.push.service.WebPushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExpiryAlertScheduler {

    private final InventorySnapshotRepository snapshotRepository;
    private final ItemExpiryAlertRepository alertRepository;
    private final WebPushService webPushService;

    /**
     * 매일 오전 8시(서버 타임존) 유통기한 알림 상태 업데이트
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void updateExpiryAlerts() {
        log.info("Starting expiry alert update...");
        processAllStores();
        sendExpiryPushNotifications();
        log.info("Expiry alert update completed.");
    }

    private void sendExpiryPushNotifications() {
        List<ItemExpiryAlert> criticalAlerts = alertRepository.findByAlertStatusNot(AlertStatus.NORMAL);
        long criticalCount = criticalAlerts.stream()
                .filter(a -> a.getAlertStatus() == AlertStatus.CRITICAL || a.getAlertStatus() == AlertStatus.EXPIRED)
                .count();
        long warningCount = criticalAlerts.stream()
                .filter(a -> a.getAlertStatus() == AlertStatus.WARNING)
                .count();

        if (criticalCount > 0 || warningCount > 0) {
            String body = String.format("Critical: %d items, Warning: %d items", criticalCount, warningCount);
            webPushService.sendToAllSubscribers("Expiry Alert", body);
        }
    }

    @Transactional
    public void processAllStores() {
        LocalDate today = LocalDate.now();

        // exp_date가 있고 재고가 있는 모든 lot 조회
        List<InventorySnapshot> allLots = snapshotRepository.findAll().stream()
                .filter(s -> s.getExpDate() != null)
                .filter(s -> s.getQtyBaseUnit().signum() > 0)
                .toList();

        for (InventorySnapshot lot : allLots) {
            long daysUntilExpiry = ChronoUnit.DAYS.between(today, lot.getExpDate());
            AlertStatus newStatus = determineAlertStatus(daysUntilExpiry);

            ItemExpiryAlert alert = alertRepository
                    .findByStoreIdAndItemIdAndLotNo(lot.getStoreId(), lot.getItemId(), lot.getLotNo())
                    .orElseGet(() -> ItemExpiryAlert.builder()
                            .storeId(lot.getStoreId())
                            .itemId(lot.getItemId())
                            .lotNo(lot.getLotNo())
                            .expDate(lot.getExpDate())
                            .qtyBaseUnit(lot.getQtyBaseUnit())
                            .build());

            alert.setQtyBaseUnit(lot.getQtyBaseUnit());
            alert.setExpDate(lot.getExpDate());

            if (alert.getAlertStatus() != newStatus) {
                alert.setAlertStatus(newStatus);
                alert.setNotifiedAt(LocalDateTime.now());
            }

            alertRepository.save(alert);
        }
    }

    /**
     * 특정 매장의 알림 상태를 즉시 갱신
     */
    @Transactional
    public void refreshAlerts(Long storeId) {
        LocalDate today = LocalDate.now();

        List<InventorySnapshot> lots = snapshotRepository.findAllLotsWithExpDate(storeId);

        for (InventorySnapshot lot : lots) {
            long daysUntilExpiry = ChronoUnit.DAYS.between(today, lot.getExpDate());
            AlertStatus newStatus = determineAlertStatus(daysUntilExpiry);

            ItemExpiryAlert alert = alertRepository
                    .findByStoreIdAndItemIdAndLotNo(lot.getStoreId(), lot.getItemId(), lot.getLotNo())
                    .orElseGet(() -> ItemExpiryAlert.builder()
                            .storeId(lot.getStoreId())
                            .itemId(lot.getItemId())
                            .lotNo(lot.getLotNo())
                            .expDate(lot.getExpDate())
                            .qtyBaseUnit(lot.getQtyBaseUnit())
                            .build());

            alert.setQtyBaseUnit(lot.getQtyBaseUnit());
            alert.setAlertStatus(newStatus);
            alert.setNotifiedAt(LocalDateTime.now());
            alertRepository.save(alert);
        }
    }

    public static AlertStatus determineAlertStatus(long daysUntilExpiry) {
        if (daysUntilExpiry <= 0) return AlertStatus.EXPIRED;
        if (daysUntilExpiry <= 3) return AlertStatus.CRITICAL;
        if (daysUntilExpiry <= 7) return AlertStatus.WARNING;
        return AlertStatus.NORMAL;
    }
}
