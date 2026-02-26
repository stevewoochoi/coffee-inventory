package com.coffee.domain.inventory.service;

import com.coffee.domain.inventory.dto.ForecastDto;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ForecastService {

    private final InventorySnapshotRepository snapshotRepository;
    private final StockLedgerRepository ledgerRepository;
    private final ItemRepository itemRepository;

    public ForecastDto.Response getForecast(Long storeId, Long brandId) {
        // Current stock per item
        Map<Long, BigDecimal> stockMap = new HashMap<>();
        snapshotRepository.findByStoreId(storeId)
                .forEach(s -> stockMap.merge(s.getItemId(), s.getQtyBaseUnit(), BigDecimal::add));

        // 14-day usage
        LocalDateTime since14 = LocalDateTime.now().minusDays(14);
        Map<Long, BigDecimal> totalUsage14 = new HashMap<>();
        for (Object[] row : ledgerRepository.sumQtyByStoreIdAndTypeSince(storeId, LedgerType.SELL, since14)) {
            totalUsage14.put((Long) row[0], (BigDecimal) row[1]);
        }

        // 7-day usage (for trend comparison)
        LocalDateTime since7 = LocalDateTime.now().minusDays(7);
        Map<Long, BigDecimal> totalUsage7 = new HashMap<>();
        for (Object[] row : ledgerRepository.sumQtyByStoreIdAndTypeSince(storeId, LedgerType.SELL, since7)) {
            totalUsage7.put((Long) row[0], (BigDecimal) row[1]);
        }

        // Get all active items
        List<Item> items = brandId != null
                ? itemRepository.findByBrandIdAndIsActiveTrue(brandId)
                : itemRepository.findByIsActiveTrue();

        List<ForecastDto.ItemForecast> forecasts = new ArrayList<>();

        for (Item item : items) {
            BigDecimal currentStock = stockMap.getOrDefault(item.getId(), BigDecimal.ZERO);
            BigDecimal minStock = item.getMinStockQty() != null ? item.getMinStockQty() : BigDecimal.ZERO;

            BigDecimal avg14 = totalUsage14.getOrDefault(item.getId(), BigDecimal.ZERO)
                    .divide(BigDecimal.valueOf(14), 3, RoundingMode.HALF_UP);
            BigDecimal avg7 = totalUsage7.getOrDefault(item.getId(), BigDecimal.ZERO)
                    .divide(BigDecimal.valueOf(7), 3, RoundingMode.HALF_UP);

            BigDecimal daysUntilEmpty = avg14.compareTo(BigDecimal.ZERO) > 0
                    ? currentStock.divide(avg14, 1, RoundingMode.HALF_UP)
                    : new BigDecimal("999");

            BigDecimal fillPercentage = minStock.compareTo(BigDecimal.ZERO) > 0
                    ? currentStock.divide(minStock, 3, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                    : (currentStock.compareTo(BigDecimal.ZERO) > 0 ? new BigDecimal("100") : BigDecimal.ZERO);
            if (fillPercentage.compareTo(new BigDecimal("100")) > 0) {
                fillPercentage = new BigDecimal("100");
            }

            // Trend: compare 7-day avg vs first-week avg (14-day - 7-day) / 7
            String trend = "STABLE";
            BigDecimal firstWeekAvg = totalUsage14.getOrDefault(item.getId(), BigDecimal.ZERO)
                    .subtract(totalUsage7.getOrDefault(item.getId(), BigDecimal.ZERO))
                    .divide(BigDecimal.valueOf(7), 3, RoundingMode.HALF_UP);
            if (avg7.compareTo(BigDecimal.ZERO) > 0 && firstWeekAvg.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal change = avg7.subtract(firstWeekAvg).divide(firstWeekAvg, 3, RoundingMode.HALF_UP);
                if (change.compareTo(new BigDecimal("0.1")) > 0) trend = "UP";
                else if (change.compareTo(new BigDecimal("-0.1")) < 0) trend = "DOWN";
            }

            forecasts.add(ForecastDto.ItemForecast.builder()
                    .itemId(item.getId())
                    .itemName(item.getName())
                    .category(item.getCategory())
                    .baseUnit(item.getBaseUnit())
                    .currentStock(currentStock)
                    .minStock(minStock)
                    .avgDailyUsage(avg14)
                    .daysUntilEmpty(daysUntilEmpty)
                    .fillPercentage(fillPercentage)
                    .trend(trend)
                    .build());
        }

        return ForecastDto.Response.builder()
                .storeId(storeId)
                .items(forecasts)
                .build();
    }
}
