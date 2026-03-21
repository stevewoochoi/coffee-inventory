package com.coffee.domain.inventory.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.domain.inventory.dto.DailyPhysicalCountDto;
import com.coffee.domain.inventory.entity.DailyPhysicalCount;
import com.coffee.domain.inventory.repository.DailyPhysicalCountRepository;
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
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyPhysicalCountService {

    private final DailyPhysicalCountRepository dailyPhysicalCountRepository;
    private final ItemRepository itemRepository;
    private final StoreRepository storeRepository;

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
        Map<Long, Map<Integer, BigDecimal>> countsByItem = counts.stream()
                .collect(Collectors.groupingBy(
                        DailyPhysicalCount::getItemId,
                        Collectors.toMap(
                                c -> c.getCountDate().getDayOfMonth(),
                                DailyPhysicalCount::getQty,
                                (a, b) -> b
                        )
                ));

        List<DailyPhysicalCountDto.ItemCountRow> rows = items.stream()
                .map(item -> DailyPhysicalCountDto.ItemCountRow.builder()
                        .itemId(item.getId())
                        .itemName(item.getName())
                        .itemNameJa(item.getNameJa())
                        .dailyCounts(countsByItem.getOrDefault(item.getId(), Collections.emptyMap()))
                        .build())
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
        Optional<DailyPhysicalCount> existing = dailyPhysicalCountRepository
                .findByStoreIdAndItemIdAndCountDate(storeId, request.getItemId(), request.getCountDate());

        DailyPhysicalCount entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setQty(request.getQty());
            entity.setMemo(request.getMemo());
        } else {
            entity = DailyPhysicalCount.builder()
                    .storeId(storeId)
                    .itemId(request.getItemId())
                    .countDate(request.getCountDate())
                    .qty(request.getQty())
                    .memo(request.getMemo())
                    .createdBy(userId)
                    .build();
        }

        entity = dailyPhysicalCountRepository.save(entity);

        return DailyPhysicalCountDto.SaveResponse.builder()
                .id(entity.getId())
                .itemId(entity.getItemId())
                .countDate(entity.getCountDate())
                .qty(entity.getQty())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
