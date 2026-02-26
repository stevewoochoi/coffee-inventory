package com.coffee.domain.ordering.service;

import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.PackagingStatus;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.dto.OrderNeedsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderNeedsService {

    private static final int DEMAND_LOOKBACK_DAYS = 14;

    private final ItemRepository itemRepository;
    private final PackagingRepository packagingRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final SupplierRepository supplierRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final StockLedgerRepository ledgerRepository;

    public OrderNeedsDto.Response getOrderNeeds(Long storeId, Long brandId) {
        // 1. Get all active items for this brand
        List<Item> allItems = itemRepository.findByBrandIdAndIsActiveTrue(brandId);

        // 2. Calculate 14-day average daily usage from SELL ledger
        LocalDateTime since = LocalDateTime.now().minusDays(DEMAND_LOOKBACK_DAYS);
        Map<Long, BigDecimal> totalSellQty = new HashMap<>();
        List<Object[]> sellData = ledgerRepository.sumQtyByStoreIdAndTypeSince(storeId, LedgerType.SELL, since);
        for (Object[] row : sellData) {
            Long itemId = (Long) row[0];
            BigDecimal qty = (BigDecimal) row[1];
            totalSellQty.put(itemId, qty);
        }

        // 3. Get current stock per item (aggregated across lots)
        Map<Long, BigDecimal> currentStockMap = new HashMap<>();
        snapshotRepository.findByStoreId(storeId).forEach(snap ->
                currentStockMap.merge(snap.getItemId(), snap.getQtyBaseUnit(), BigDecimal::add));

        // 4. Get all active packagings, grouped by itemId
        List<Packaging> allPackagings = packagingRepository.findByStatus(PackagingStatus.ACTIVE);
        Map<Long, List<Packaging>> packagingsByItem = allPackagings.stream()
                .collect(Collectors.groupingBy(Packaging::getItemId));

        // 5. Get all supplier items, grouped by packagingId
        List<SupplierItem> allSupplierItems = supplierItemRepository.findAll();
        Map<Long, List<SupplierItem>> supplierItemsByPackaging = allSupplierItems.stream()
                .collect(Collectors.groupingBy(SupplierItem::getPackagingId));

        // 6. Load supplier names
        Map<Long, Supplier> supplierMap = supplierRepository.findAll().stream()
                .collect(Collectors.toMap(Supplier::getId, s -> s));

        // 7. Classify each item
        List<OrderNeedsDto.NeedsItem> urgent = new ArrayList<>();
        List<OrderNeedsDto.NeedsItem> recommended = new ArrayList<>();
        List<OrderNeedsDto.NeedsItem> predicted = new ArrayList<>();

        for (Item item : allItems) {
            BigDecimal currentStock = currentStockMap.getOrDefault(item.getId(), BigDecimal.ZERO);
            BigDecimal minStock = item.getMinStockQty() != null ? item.getMinStockQty() : BigDecimal.ZERO;

            BigDecimal avgDailyUsage = totalSellQty.getOrDefault(item.getId(), BigDecimal.ZERO)
                    .divide(BigDecimal.valueOf(DEMAND_LOOKBACK_DAYS), 3, RoundingMode.HALF_UP);

            BigDecimal daysUntilEmpty = avgDailyUsage.compareTo(BigDecimal.ZERO) > 0
                    ? currentStock.divide(avgDailyUsage, 1, RoundingMode.HALF_UP)
                    : new BigDecimal("999");

            // Build supplier options
            List<Packaging> itemPackagings = packagingsByItem.getOrDefault(item.getId(), Collections.emptyList());
            List<OrderNeedsDto.SupplierOption> supplierOptions = buildSupplierOptions(
                    itemPackagings, supplierItemsByPackaging, supplierMap, currentStock, minStock);

            // Calculate suggested quantity (base unit): max(0, minStock*2 - currentStock)
            BigDecimal suggestedBaseUnit = minStock.multiply(BigDecimal.valueOf(2)).subtract(currentStock);
            int suggestedQty = suggestedBaseUnit.compareTo(BigDecimal.ZERO) > 0
                    ? suggestedBaseUnit.setScale(0, RoundingMode.CEILING).intValue()
                    : 0;

            // Skip items with no suppliers
            if (supplierOptions.isEmpty()) continue;

            OrderNeedsDto.NeedsItem needsItem = OrderNeedsDto.NeedsItem.builder()
                    .itemId(item.getId())
                    .itemName(item.getName())
                    .category(item.getCategory())
                    .baseUnit(item.getBaseUnit())
                    .currentStock(currentStock)
                    .minStock(minStock)
                    .avgDailyUsage(avgDailyUsage)
                    .daysUntilEmpty(daysUntilEmpty)
                    .suggestedQty(suggestedQty)
                    .suppliers(supplierOptions)
                    .build();

            // Classify: URGENT if stock <= minStock
            if (minStock.compareTo(BigDecimal.ZERO) > 0 && currentStock.compareTo(minStock) <= 0) {
                urgent.add(needsItem);
            }
            // RECOMMENDED if stock <= minStock * 1.5
            else if (minStock.compareTo(BigDecimal.ZERO) > 0
                    && currentStock.compareTo(minStock.multiply(new BigDecimal("1.5"))) <= 0) {
                recommended.add(needsItem);
            }
            // PREDICTED if days until empty <= 3
            else if (daysUntilEmpty.compareTo(new BigDecimal("3")) <= 0
                    && avgDailyUsage.compareTo(BigDecimal.ZERO) > 0) {
                predicted.add(needsItem);
            }
        }

        return OrderNeedsDto.Response.builder()
                .storeId(storeId)
                .urgent(urgent)
                .recommended(recommended)
                .predicted(predicted)
                .build();
    }

    private List<OrderNeedsDto.SupplierOption> buildSupplierOptions(
            List<Packaging> packagings,
            Map<Long, List<SupplierItem>> supplierItemsByPackaging,
            Map<Long, Supplier> supplierMap,
            BigDecimal currentStock,
            BigDecimal minStock) {

        // Group supplier items by supplier
        Map<Long, List<OrderNeedsDto.PackagingOption>> bySupplier = new LinkedHashMap<>();

        for (Packaging pkg : packagings) {
            List<SupplierItem> sis = supplierItemsByPackaging.getOrDefault(pkg.getId(), Collections.emptyList());
            for (SupplierItem si : sis) {
                BigDecimal suggestedBaseUnit = minStock.multiply(BigDecimal.valueOf(2)).subtract(currentStock);
                int suggestedPackQty = 0;
                if (suggestedBaseUnit.compareTo(BigDecimal.ZERO) > 0
                        && pkg.getUnitsPerPack().compareTo(BigDecimal.ZERO) > 0) {
                    suggestedPackQty = suggestedBaseUnit
                            .divide(pkg.getUnitsPerPack(), 0, RoundingMode.CEILING)
                            .intValue();
                }

                OrderNeedsDto.PackagingOption option = OrderNeedsDto.PackagingOption.builder()
                        .packagingId(pkg.getId())
                        .packName(pkg.getPackName())
                        .unitsPerPack(pkg.getUnitsPerPack())
                        .price(si.getPrice())
                        .leadTimeDays(si.getLeadTimeDays())
                        .suggestedPackQty(suggestedPackQty)
                        .build();

                bySupplier.computeIfAbsent(si.getSupplierId(), k -> new ArrayList<>()).add(option);
            }
        }

        return bySupplier.entrySet().stream()
                .map(entry -> {
                    Supplier supplier = supplierMap.get(entry.getKey());
                    return OrderNeedsDto.SupplierOption.builder()
                            .supplierId(entry.getKey())
                            .supplierName(supplier != null ? supplier.getName() : "Unknown")
                            .packagings(entry.getValue())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
