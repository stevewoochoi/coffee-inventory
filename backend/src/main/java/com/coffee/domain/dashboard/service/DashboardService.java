package com.coffee.domain.dashboard.service;

import com.coffee.domain.dashboard.dto.DashboardDto;
import com.coffee.domain.inventory.entity.AlertStatus;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.ItemExpiryAlertRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.inventory.service.LowStockService;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.waste.entity.Waste;
import com.coffee.domain.waste.repository.WasteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final StockLedgerRepository stockLedgerRepository;
    private final WasteRepository wasteRepository;
    private final ItemExpiryAlertRepository expiryAlertRepository;
    private final LowStockService lowStockService;
    private final StoreRepository storeRepository;

    public DashboardDto.StoreDashboard getStoreDashboard(Long storeId) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();

        // 오늘 입고 건수
        List<Object[]> receiveData = stockLedgerRepository.sumQtyByStoreIdAndTypeSince(
                storeId, LedgerType.RECEIVE, todayStart);
        long todayReceiveCount = receiveData.size();

        // 오늘 폐기량
        BigDecimal todayWasteQty = wasteRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .filter(w -> w.getCreatedAt() != null && w.getCreatedAt().toLocalDate().equals(today))
                .map(Waste::getQtyBaseUnit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 저재고 수
        int lowStockCount = lowStockService.getLowStockItems(storeId).size();

        // 유통기한 임박 수
        int expiryAlertCount = (int) expiryAlertRepository.findByStoreId(storeId).stream()
                .filter(a -> a.getAlertStatus() != AlertStatus.NORMAL)
                .count();

        // 최근 7일 일별 소비량
        LocalDateTime weekAgo = today.minusDays(7).atStartOfDay();
        List<Object[]> sellData = stockLedgerRepository.sumQtyByStoreIdAndTypeSince(
                storeId, LedgerType.SELL, weekAgo);
        // sellData는 아이템별 합산이므로, 전체 합산
        BigDecimal totalSellQty = sellData.stream()
                .map(row -> (BigDecimal) row[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 간단히 7일 평균으로 일별 데이터 생성
        List<DashboardDto.DailyConsumption> dailyConsumption = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            dailyConsumption.add(DashboardDto.DailyConsumption.builder()
                    .date(today.minusDays(i))
                    .totalQty(totalSellQty.divide(BigDecimal.valueOf(7), 3, java.math.RoundingMode.HALF_UP))
                    .build());
        }

        return DashboardDto.StoreDashboard.builder()
                .todayReceiveCount(todayReceiveCount)
                .todayWasteQty(todayWasteQty)
                .lowStockCount(lowStockCount)
                .expiryAlertCount(expiryAlertCount)
                .dailyConsumption(dailyConsumption)
                .monthOrderCost(BigDecimal.ZERO) // TODO: aggregate from order_line prices
                .build();
    }

    public DashboardDto.BrandDashboard getBrandDashboard(Long brandId) {
        List<Store> stores = storeRepository.findByBrandId(brandId);

        List<DashboardDto.StoreSummary> summaries = stores.stream()
                .map(store -> {
                    int lowStockCount = lowStockService.getLowStockItems(store.getId()).size();
                    int expiryAlertCount = (int) expiryAlertRepository.findByStoreId(store.getId()).stream()
                            .filter(a -> a.getAlertStatus() != AlertStatus.NORMAL)
                            .count();
                    return DashboardDto.StoreSummary.builder()
                            .storeId(store.getId())
                            .storeName(store.getName())
                            .lowStockCount(lowStockCount)
                            .expiryAlertCount(expiryAlertCount)
                            .monthOrderCost(BigDecimal.ZERO)
                            .build();
                })
                .toList();

        return DashboardDto.BrandDashboard.builder()
                .storeSummaries(summaries)
                .totalOrderCost(BigDecimal.ZERO)
                .build();
    }
}
