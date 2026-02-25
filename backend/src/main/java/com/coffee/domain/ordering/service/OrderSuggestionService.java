package com.coffee.domain.ordering.service;

import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.ordering.dto.OrderSuggestionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderSuggestionService {

    private static final int DEMAND_LOOKBACK_DAYS = 14;
    private static final int COVER_DAYS = 3;
    private static final BigDecimal SAFETY_STOCK_DAYS = new BigDecimal("2");

    private final SupplierItemRepository supplierItemRepository;
    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final StockLedgerRepository ledgerRepository;

    public OrderSuggestionDto.Response suggest(Long storeId, Long supplierId) {
        // 1. 공급사가 취급하는 포장단위(SupplierItem) 조회
        List<SupplierItem> supplierItems = supplierItemRepository.findBySupplierId(supplierId);

        // 2. 최근 N일 간 매장의 아이템별 판매 소모량 집계
        LocalDateTime since = LocalDateTime.now().minusDays(DEMAND_LOOKBACK_DAYS);
        Map<Long, BigDecimal> totalSellQty = new HashMap<>();
        List<Object[]> sellData = ledgerRepository.sumQtyByStoreIdAndTypeSince(storeId, LedgerType.SELL, since);
        for (Object[] row : sellData) {
            Long itemId = (Long) row[0];
            BigDecimal qty = (BigDecimal) row[1];
            totalSellQty.put(itemId, qty);
        }

        // 3. 현재 재고 조회
        Map<Long, BigDecimal> currentStockMap = new HashMap<>();
        for (InventorySnapshot snap : snapshotRepository.findByStoreId(storeId)) {
            currentStockMap.put(snap.getItemId(), snap.getQtyBaseUnit());
        }

        // 4. 각 SupplierItem에 대해 추천 수량 계산
        List<OrderSuggestionDto.SuggestionLine> lines = new ArrayList<>();

        for (SupplierItem si : supplierItems) {
            Packaging packaging = packagingRepository.findById(si.getPackagingId()).orElse(null);
            if (packaging == null) continue;

            Item item = itemRepository.findById(packaging.getItemId()).orElse(null);
            if (item == null) continue;

            BigDecimal avgDailyDemand = totalSellQty.getOrDefault(item.getId(), BigDecimal.ZERO)
                    .divide(BigDecimal.valueOf(DEMAND_LOOKBACK_DAYS), 3, RoundingMode.HALF_UP);

            // 로스율 반영: 조정된 수요 = 일평균수요 * (1 + loss_rate)
            BigDecimal lossMultiplier = BigDecimal.ONE.add(
                    item.getLossRate() != null ? item.getLossRate() : BigDecimal.ZERO);
            BigDecimal adjustedDemand = avgDailyDemand.multiply(lossMultiplier);

            BigDecimal currentStock = currentStockMap.getOrDefault(item.getId(), BigDecimal.ZERO);
            int leadTime = si.getLeadTimeDays() != null ? si.getLeadTimeDays() : 1;
            BigDecimal safetyStock = adjustedDemand.multiply(SAFETY_STOCK_DAYS);

            // 공식: ceil((adjustedDemand * (leadTime + coverDays) + safetyStock - currentStock) / unitsPerPack)
            BigDecimal neededBaseUnit = adjustedDemand
                    .multiply(BigDecimal.valueOf(leadTime + COVER_DAYS))
                    .add(safetyStock)
                    .subtract(currentStock);

            int suggestedPackQty = 0;
            if (neededBaseUnit.compareTo(BigDecimal.ZERO) > 0 && packaging.getUnitsPerPack().compareTo(BigDecimal.ZERO) > 0) {
                suggestedPackQty = neededBaseUnit
                        .divide(packaging.getUnitsPerPack(), 0, RoundingMode.CEILING)
                        .intValue();
            }

            lines.add(OrderSuggestionDto.SuggestionLine.builder()
                    .packagingId(packaging.getId())
                    .itemId(item.getId())
                    .itemName(item.getName())
                    .packName(packaging.getPackName())
                    .unitsPerPack(packaging.getUnitsPerPack())
                    .currentStock(currentStock)
                    .avgDailyDemand(avgDailyDemand)
                    .leadTimeDays(leadTime)
                    .suggestedPackQty(suggestedPackQty)
                    .build());
        }

        return OrderSuggestionDto.Response.builder()
                .storeId(storeId)
                .supplierId(supplierId)
                .lines(lines)
                .build();
    }
}
