package com.coffee.domain.pos.service;

import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.pos.dto.PosSalesDto;
import com.coffee.domain.pos.entity.PosSales;
import com.coffee.domain.pos.repository.PosSalesRepository;
import com.coffee.domain.recipe.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PosSalesService {

    private final PosSalesRepository posSalesRepository;
    private final RecipeService recipeService;
    private final InventoryService inventoryService;

    @Transactional
    public PosSalesDto.Response recordSale(PosSalesDto.Request request) {
        int qty = request.getQty() != null ? request.getQty() : 1;

        PosSales sale = PosSales.builder()
                .storeId(request.getStoreId())
                .businessDate(request.getBusinessDate())
                .menuId(request.getMenuId())
                .optionJson(request.getOptionJson())
                .qty(qty)
                .build();
        posSalesRepository.save(sale);

        // 레시피 기반으로 재고 차감
        Map<Long, BigDecimal> consumption = recipeService.calculateConsumption(request.getMenuId());
        for (Map.Entry<Long, BigDecimal> entry : consumption.entrySet()) {
            BigDecimal totalQty = entry.getValue().multiply(new BigDecimal(qty)).negate();
            inventoryService.recordStockChange(
                    request.getStoreId(),
                    entry.getKey(),
                    totalQty,
                    LedgerType.SELL,
                    "POS_SALES",
                    sale.getId(),
                    null,
                    null
            );
        }

        return toResponse(sale);
    }

    public List<PosSalesDto.Response> getSummary(Long storeId, LocalDate date) {
        return posSalesRepository.findByStoreIdAndBusinessDate(storeId, date).stream()
                .map(this::toResponse)
                .toList();
    }

    private PosSalesDto.Response toResponse(PosSales s) {
        return PosSalesDto.Response.builder()
                .id(s.getId())
                .storeId(s.getStoreId())
                .businessDate(s.getBusinessDate())
                .menuId(s.getMenuId())
                .optionJson(s.getOptionJson())
                .qty(s.getQty())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
