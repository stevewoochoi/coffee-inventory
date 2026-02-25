package com.coffee.domain.inventory.service;

import com.coffee.domain.inventory.dto.LowStockDto;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LowStockService {

    private final InventorySnapshotRepository snapshotRepository;
    private final ItemRepository itemRepository;

    public List<LowStockDto.Response> getLowStockItems(Long storeId) {
        List<InventorySnapshot> snapshots = snapshotRepository.findByStoreId(storeId);

        // 아이템별 총 재고 합산
        Map<Long, BigDecimal> itemQtyMap = snapshots.stream()
                .collect(Collectors.groupingBy(
                        InventorySnapshot::getItemId,
                        Collectors.reducing(BigDecimal.ZERO, InventorySnapshot::getQtyBaseUnit, BigDecimal::add)));

        List<LowStockDto.Response> results = new ArrayList<>();

        for (Map.Entry<Long, BigDecimal> entry : itemQtyMap.entrySet()) {
            Long itemId = entry.getKey();
            BigDecimal currentQty = entry.getValue();

            Item item = itemRepository.findByIdAndIsActiveTrue(itemId).orElse(null);
            if (item == null || item.getMinStockQty() == null) continue;

            if (currentQty.compareTo(item.getMinStockQty()) <= 0) {
                results.add(LowStockDto.Response.builder()
                        .itemId(itemId)
                        .itemName(item.getName())
                        .baseUnit(item.getBaseUnit())
                        .currentQty(currentQty)
                        .minStockQty(item.getMinStockQty())
                        .deficit(item.getMinStockQty().subtract(currentQty))
                        .build());
            }
        }

        return results;
    }
}
