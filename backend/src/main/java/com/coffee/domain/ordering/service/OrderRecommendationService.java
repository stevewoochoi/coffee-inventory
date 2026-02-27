package com.coffee.domain.ordering.service;

import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderRecommendationService {

    private static final int LOOKBACK_DAYS = 14;
    private static final int SAFETY_DAYS = 2;

    private final StockLedgerRepository ledgerRepository;
    private final InventorySnapshotRepository snapshotRepository;

    public int calculateRecommendedQty(Long storeId, Item item, Packaging packaging, int leadTimeDays) {
        // avg_daily_usage = last N days SELL ledger / days
        LocalDateTime since = LocalDateTime.now().minusDays(LOOKBACK_DAYS);
        BigDecimal totalSellQty = BigDecimal.ZERO;

        List<Object[]> sellData = ledgerRepository.sumQtyByStoreIdAndTypeSince(storeId, LedgerType.SELL, since);
        for (Object[] row : sellData) {
            Long itemId = (Long) row[0];
            if (itemId.equals(item.getId())) {
                totalSellQty = (BigDecimal) row[1];
                break;
            }
        }

        BigDecimal avgDailyUsage = totalSellQty
                .divide(BigDecimal.valueOf(LOOKBACK_DAYS), 3, RoundingMode.HALF_UP);

        // demand = avg_daily_usage * (lead_time_days + safety_days)
        BigDecimal demand = avgDailyUsage.multiply(BigDecimal.valueOf(leadTimeDays + SAFETY_DAYS));

        // target_stock = max(min_stock_qty, demand)
        BigDecimal minStock = item.getMinStockQty() != null ? item.getMinStockQty() : BigDecimal.ZERO;
        BigDecimal targetStock = demand.max(minStock);

        // current_stock
        BigDecimal currentStock = snapshotRepository.sumQtyByStoreIdAndItemId(storeId, item.getId());

        // recommended_qty = max(0, target_stock - current_stock)
        BigDecimal recommendedQty = targetStock.subtract(currentStock).max(BigDecimal.ZERO);

        if (recommendedQty.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }

        // pack_qty = ceil(recommended_qty / units_per_pack)
        BigDecimal unitsPerPack = packaging.getUnitsPerPack();
        if (unitsPerPack.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }
        int packQty = recommendedQty.divide(unitsPerPack, 0, RoundingMode.CEILING).intValue();

        // pack_qty = min(pack_qty, max_order_qty)
        if (item.getMaxOrderQty() != null && packQty > item.getMaxOrderQty()) {
            packQty = item.getMaxOrderQty();
        }

        return packQty;
    }

    public Double calculateDaysUntilEmpty(Long storeId, Long itemId) {
        BigDecimal currentStock = snapshotRepository.sumQtyByStoreIdAndItemId(storeId, itemId);
        if (currentStock.compareTo(BigDecimal.ZERO) <= 0) {
            return 0.0;
        }

        LocalDateTime since = LocalDateTime.now().minusDays(LOOKBACK_DAYS);
        BigDecimal totalSellQty = BigDecimal.ZERO;

        List<Object[]> sellData = ledgerRepository.sumQtyByStoreIdAndTypeSince(storeId, LedgerType.SELL, since);
        for (Object[] row : sellData) {
            Long id = (Long) row[0];
            if (id.equals(itemId)) {
                totalSellQty = (BigDecimal) row[1];
                break;
            }
        }

        BigDecimal avgDailyUsage = totalSellQty
                .divide(BigDecimal.valueOf(LOOKBACK_DAYS), 3, RoundingMode.HALF_UP);

        if (avgDailyUsage.compareTo(BigDecimal.ZERO) <= 0) {
            return null; // No usage data
        }

        return currentStock.divide(avgDailyUsage, 1, RoundingMode.HALF_UP).doubleValue();
    }

    public Map<Long, BigDecimal> getCurrentStockMap(Long storeId) {
        Map<Long, BigDecimal> stockMap = new HashMap<>();
        snapshotRepository.findByStoreId(storeId).forEach(snap ->
                stockMap.merge(snap.getItemId(), snap.getQtyBaseUnit(), BigDecimal::add));
        return stockMap;
    }

    public Map<Long, BigDecimal> getDailyUsageMap(Long storeId) {
        Map<Long, BigDecimal> usageMap = new HashMap<>();
        LocalDateTime since = LocalDateTime.now().minusDays(LOOKBACK_DAYS);
        List<Object[]> sellData = ledgerRepository.sumQtyByStoreIdAndTypeSince(storeId, LedgerType.SELL, since);
        for (Object[] row : sellData) {
            Long itemId = (Long) row[0];
            BigDecimal qty = (BigDecimal) row[1];
            usageMap.put(itemId, qty.divide(BigDecimal.valueOf(LOOKBACK_DAYS), 3, RoundingMode.HALF_UP));
        }
        return usageMap;
    }
}
