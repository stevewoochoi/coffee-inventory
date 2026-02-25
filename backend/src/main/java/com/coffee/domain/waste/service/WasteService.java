package com.coffee.domain.waste.service;

import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.waste.dto.WasteDto;
import com.coffee.domain.waste.entity.Waste;
import com.coffee.domain.waste.entity.WasteType;
import com.coffee.domain.waste.repository.WasteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WasteService {

    private final WasteRepository wasteRepository;
    private final InventoryService inventoryService;

    public List<WasteDto.Response> findByStoreId(Long storeId) {
        return wasteRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WasteDto.Response create(WasteDto.Request request, Long userId) {
        WasteType type = request.getWasteType() != null
                ? WasteType.valueOf(request.getWasteType()) : WasteType.OPERATION;

        Waste waste = Waste.builder()
                .storeId(request.getStoreId())
                .itemId(request.getItemId())
                .qtyBaseUnit(request.getQtyBaseUnit())
                .reason(request.getReason())
                .wasteType(type)
                .createdBy(userId)
                .build();
        wasteRepository.save(waste);

        LedgerType ledgerType = type == WasteType.DAMAGE_RECEIVE
                ? LedgerType.DAMAGE_RECEIVE : LedgerType.WASTE;

        inventoryService.recordStockChange(
                request.getStoreId(),
                request.getItemId(),
                request.getQtyBaseUnit().negate(),
                ledgerType,
                "WASTE",
                waste.getId(),
                request.getReason(),
                userId
        );

        return toResponse(waste);
    }

    private WasteDto.Response toResponse(Waste w) {
        return WasteDto.Response.builder()
                .id(w.getId())
                .storeId(w.getStoreId())
                .itemId(w.getItemId())
                .qtyBaseUnit(w.getQtyBaseUnit())
                .reason(w.getReason())
                .wasteType(w.getWasteType().name())
                .createdBy(w.getCreatedBy())
                .createdAt(w.getCreatedAt())
                .build();
    }
}
