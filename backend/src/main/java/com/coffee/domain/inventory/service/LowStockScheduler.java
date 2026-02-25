package com.coffee.domain.inventory.service;

import com.coffee.domain.inventory.dto.LowStockDto;
import com.coffee.domain.inventory.entity.LowStockAlert;
import com.coffee.domain.inventory.repository.LowStockAlertRepository;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.push.service.WebPushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LowStockScheduler {

    private final LowStockService lowStockService;
    private final LowStockAlertRepository alertRepository;
    private final StoreRepository storeRepository;
    private final WebPushService webPushService;

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void detectLowStock() {
        log.info("Starting low stock detection...");
        List<Store> stores = storeRepository.findAll();
        int totalLowItems = 0;
        for (Store store : stores) {
            totalLowItems += refreshLowStockAlerts(store.getId());
        }
        if (totalLowItems > 0) {
            webPushService.sendToAllSubscribers(
                    "Low Stock Alert",
                    String.format("%d items are below minimum stock level", totalLowItems));
        }
        log.info("Low stock detection completed for {} stores.", stores.size());
    }

    @Transactional
    public int refreshLowStockAlerts(Long storeId) {
        alertRepository.deleteByStoreId(storeId);

        List<LowStockDto.Response> lowItems = lowStockService.getLowStockItems(storeId);
        for (LowStockDto.Response item : lowItems) {
            alertRepository.save(LowStockAlert.builder()
                    .storeId(storeId)
                    .itemId(item.getItemId())
                    .currentQty(item.getCurrentQty())
                    .minStockQty(item.getMinStockQty())
                    .build());
        }
        return lowItems.size();
    }
}
