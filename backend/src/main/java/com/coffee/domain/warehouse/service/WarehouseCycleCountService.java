package com.coffee.domain.warehouse.service;

import com.coffee.domain.inventory.dto.CycleCountDto;
import com.coffee.domain.inventory.service.CycleCountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Warehouse cycle count — delegates to existing CycleCountService.
 * Same logic; only auth boundary differs.
 */
@Service
@RequiredArgsConstructor
public class WarehouseCycleCountService {

    private final WarehouseService warehouseService;
    private final CycleCountService cycleCountService;

    @Transactional
    public CycleCountDto.SessionDetailResponse start(Long warehouseId, Long brandId,
                                                      String gradeFilter, String zoneFilter, Long userId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return cycleCountService.startSession(warehouseId, gradeFilter, zoneFilter, userId);
    }

    @Transactional(readOnly = true)
    public List<CycleCountDto.SessionResponse> listActive(Long warehouseId, Long brandId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return cycleCountService.getActiveSessions(warehouseId);
    }

    @Transactional(readOnly = true)
    public Page<CycleCountDto.SessionResponse> getHistory(Long warehouseId, Long brandId, Pageable pageable) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return cycleCountService.getHistory(warehouseId, pageable);
    }

    @Transactional(readOnly = true)
    public CycleCountDto.SessionDetailResponse getSession(Long warehouseId, Long brandId, Long sessionId) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return cycleCountService.getSession(sessionId);
    }

    @Transactional
    public CycleCountDto.LineResponse updateLine(Long warehouseId, Long brandId,
                                                  Long lineId, Double countedQty, String note) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return cycleCountService.updateLine(lineId, countedQty, note);
    }

    @Transactional
    public CycleCountDto.SessionDetailResponse complete(Long warehouseId, Long brandId,
                                                         Long sessionId, Boolean applyAdjustments) {
        warehouseService.getWarehouse(warehouseId, brandId);
        return cycleCountService.completeSession(sessionId, applyAdjustments);
    }
}
