package com.coffee.domain.inventory.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.domain.inventory.dto.DailyPhysicalCountDto;
import com.coffee.domain.inventory.entity.DailyPhysicalCount;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.DailyPhysicalCountRepository;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyPhysicalCountService {

    private final DailyPhysicalCountRepository dailyPhysicalCountRepository;
    private final ItemRepository itemRepository;
    private final StoreRepository storeRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final InventoryService inventoryService;

    @Transactional(readOnly = true)
    public DailyPhysicalCountDto.MonthlyResponse getMonthlyCount(Long storeId, int year, int month) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND, "STORE_NOT_FOUND"));

        Long brandId = store.getBrandId();
        List<Item> items = itemRepository.findByBrandIdAndIsActiveTrue(brandId);

        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<DailyPhysicalCount> counts = dailyPhysicalCountRepository
                .findByStoreIdAndCountDateBetween(storeId, startDate, endDate);

        // Group counts by itemId
        Map<Long, List<DailyPhysicalCount>> countsByItem = counts.stream()
                .collect(Collectors.groupingBy(DailyPhysicalCount::getItemId));

        List<DailyPhysicalCountDto.ItemCountRow> rows = items.stream()
                .map(item -> {
                    List<DailyPhysicalCount> itemCounts = countsByItem.getOrDefault(item.getId(), Collections.emptyList());

                    Map<Integer, BigDecimal> dailyCounts = new HashMap<>();
                    Map<Integer, BigDecimal> systemQties = new HashMap<>();
                    Map<Integer, BigDecimal> varianceQties = new HashMap<>();
                    Map<Integer, Boolean> appliedFlags = new HashMap<>();

                    for (DailyPhysicalCount c : itemCounts) {
                        int day = c.getCountDate().getDayOfMonth();
                        dailyCounts.put(day, c.getQty());
                        if (c.getSystemQty() != null) systemQties.put(day, c.getSystemQty());
                        if (c.getVarianceQty() != null) varianceQties.put(day, c.getVarianceQty());
                        appliedFlags.put(day, Boolean.TRUE.equals(c.getIsApplied()));
                    }

                    // Get current live system qty
                    BigDecimal currentSystemQty = snapshotRepository.sumQtyByStoreIdAndItemId(storeId, item.getId());

                    return DailyPhysicalCountDto.ItemCountRow.builder()
                            .itemId(item.getId())
                            .itemName(item.getName())
                            .itemNameJa(item.getNameJa())
                            .baseUnit(item.getBaseUnit())
                            .stockUnit(item.getStockUnit())
                            .currentSystemQty(currentSystemQty != null ? currentSystemQty : BigDecimal.ZERO)
                            .dailyCounts(dailyCounts)
                            .systemQties(systemQties)
                            .varianceQties(varianceQties)
                            .appliedFlags(appliedFlags)
                            .build();
                })
                .collect(Collectors.toList());

        return DailyPhysicalCountDto.MonthlyResponse.builder()
                .year(year)
                .month(month)
                .rows(rows)
                .build();
    }

    @Transactional
    public DailyPhysicalCountDto.SaveResponse saveCount(DailyPhysicalCountDto.SaveRequest request,
                                                         Long storeId, Long userId) {
        // 1. Get current system qty
        BigDecimal systemQty = snapshotRepository.sumQtyByStoreIdAndItemId(storeId, request.getItemId());
        if (systemQty == null) systemQty = BigDecimal.ZERO;

        // 2. Calculate variance (counted - system)
        BigDecimal varianceQty = request.getQty().subtract(systemQty);

        // 3. Find or create daily count record
        Optional<DailyPhysicalCount> existing = dailyPhysicalCountRepository
                .findByStoreIdAndItemIdAndCountDate(storeId, request.getItemId(), request.getCountDate());

        DailyPhysicalCount entity;
        boolean wasAppliedBefore = false;
        BigDecimal previousVariance = BigDecimal.ZERO;

        if (existing.isPresent()) {
            entity = existing.get();
            wasAppliedBefore = Boolean.TRUE.equals(entity.getIsApplied());
            previousVariance = entity.getVarianceQty() != null ? entity.getVarianceQty() : BigDecimal.ZERO;
            entity.setQty(request.getQty());
            entity.setMemo(request.getMemo());
            entity.setSystemQty(systemQty);
            entity.setVarianceQty(varianceQty);
        } else {
            entity = DailyPhysicalCount.builder()
                    .storeId(storeId)
                    .itemId(request.getItemId())
                    .countDate(request.getCountDate())
                    .qty(request.getQty())
                    .memo(request.getMemo())
                    .createdBy(userId)
                    .systemQty(systemQty)
                    .varianceQty(varianceQty)
                    .build();
        }

        // 4. Apply inventory adjustment if variance exists
        if (varianceQty.compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal adjustmentQty;
            if (wasAppliedBefore) {
                // Reverse previous adjustment and apply new one
                adjustmentQty = varianceQty.subtract(previousVariance);
            } else {
                adjustmentQty = varianceQty;
            }

            if (adjustmentQty.compareTo(BigDecimal.ZERO) != 0) {
                inventoryService.recordStockChange(
                        storeId, request.getItemId(),
                        adjustmentQty, LedgerType.ADJUST,
                        "DAILY_COUNT", entity.getId() != null ? entity.getId() : 0L,
                        "Daily count adjustment: " + request.getCountDate(),
                        userId);
            }
            entity.setIsApplied(true);
            entity.setAppliedAt(LocalDateTime.now());
        } else if (wasAppliedBefore && previousVariance.compareTo(BigDecimal.ZERO) != 0) {
            // Counted qty matches system qty, but there was a previous adjustment - reverse it
            inventoryService.recordStockChange(
                    storeId, request.getItemId(),
                    previousVariance.negate(), LedgerType.ADJUST,
                    "DAILY_COUNT", entity.getId(),
                    "Daily count reversal: " + request.getCountDate(),
                    userId);
            entity.setIsApplied(false);
            entity.setAppliedAt(null);
        }

        entity = dailyPhysicalCountRepository.save(entity);

        return DailyPhysicalCountDto.SaveResponse.builder()
                .id(entity.getId())
                .itemId(entity.getItemId())
                .countDate(entity.getCountDate())
                .qty(entity.getQty())
                .systemQty(entity.getSystemQty())
                .varianceQty(entity.getVarianceQty())
                .isApplied(entity.getIsApplied())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
