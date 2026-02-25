package com.coffee.domain.physicalcount.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.physicalcount.dto.PhysicalCountDto;
import com.coffee.domain.physicalcount.dto.PhysicalCountLineDto;
import com.coffee.domain.physicalcount.entity.CountStatus;
import com.coffee.domain.physicalcount.entity.PhysicalCount;
import com.coffee.domain.physicalcount.entity.PhysicalCountLine;
import com.coffee.domain.physicalcount.repository.PhysicalCountLineRepository;
import com.coffee.domain.physicalcount.repository.PhysicalCountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PhysicalCountService {

    private final PhysicalCountRepository countRepository;
    private final PhysicalCountLineRepository lineRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final InventoryService inventoryService;

    @Transactional
    public PhysicalCountDto.Response startCount(PhysicalCountDto.StartRequest request) {
        PhysicalCount pc = PhysicalCount.builder()
                .storeId(request.getStoreId())
                .countDate(LocalDate.now())
                .countedBy(request.getCountedBy())
                .build();
        countRepository.save(pc);

        // 현재 스냅샷 기준으로 아이템별 합산 라인 자동 생성
        List<InventorySnapshot> snapshots = snapshotRepository.findByStoreId(request.getStoreId());

        // 아이템별 수량 합산 (lot별 스냅샷이 여러 개일 수 있으므로)
        var itemQtyMap = snapshots.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        InventorySnapshot::getItemId,
                        java.util.stream.Collectors.reducing(
                                BigDecimal.ZERO,
                                InventorySnapshot::getQtyBaseUnit,
                                BigDecimal::add)));

        List<PhysicalCountLine> lines = itemQtyMap.entrySet().stream()
                .map(entry -> PhysicalCountLine.builder()
                        .countId(pc.getId())
                        .itemId(entry.getKey())
                        .systemQty(entry.getValue())
                        .build())
                .toList();

        lineRepository.saveAll(lines);

        return toResponse(pc);
    }

    @Transactional
    public PhysicalCountLineDto.Response updateLine(Long countId, Long lineId,
                                                     PhysicalCountLineDto.UpdateRequest request) {
        PhysicalCount pc = getCountOrThrow(countId);
        if (pc.getStatus() != CountStatus.IN_PROGRESS) {
            throw new BusinessException("Cannot update lines for a non-active count", HttpStatus.BAD_REQUEST);
        }

        PhysicalCountLine line = lineRepository.findByCountIdAndId(countId, lineId)
                .orElseThrow(() -> new ResourceNotFoundException("PhysicalCountLine", lineId));

        line.setActualQty(request.getActualQty());
        line.setGapQty(request.getActualQty().subtract(line.getSystemQty()));
        if (request.getNote() != null) {
            line.setNote(request.getNote());
        }
        lineRepository.save(line);

        return PhysicalCountLineDto.fromEntity(line);
    }

    @Transactional
    public PhysicalCountDto.Response completeCount(Long countId) {
        PhysicalCount pc = getCountOrThrow(countId);
        if (pc.getStatus() != CountStatus.IN_PROGRESS) {
            throw new BusinessException("Count is not in progress", HttpStatus.BAD_REQUEST);
        }

        List<PhysicalCountLine> lines = lineRepository.findByCountId(countId);

        // 모든 라인에 실제 수량이 입력되어야 함
        boolean allCounted = lines.stream().allMatch(l -> l.getActualQty() != null);
        if (!allCounted) {
            throw new BusinessException("All items must be counted before completing", HttpStatus.BAD_REQUEST);
        }

        // 차이분을 StockLedger에 ADJUST로 기록
        for (PhysicalCountLine line : lines) {
            if (line.getGapQty() != null && line.getGapQty().compareTo(BigDecimal.ZERO) != 0) {
                inventoryService.recordStockChange(
                        pc.getStoreId(),
                        line.getItemId(),
                        line.getGapQty(),
                        LedgerType.ADJUST,
                        "PHYSICAL_COUNT",
                        countId,
                        "Physical count adjustment",
                        pc.getCountedBy()
                );
            }
        }

        pc.setStatus(CountStatus.COMPLETED);
        pc.setCompletedAt(LocalDateTime.now());
        countRepository.save(pc);

        return toResponse(pc);
    }

    @Transactional(readOnly = true)
    public List<PhysicalCountDto.Response> getHistory(Long storeId) {
        return countRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PhysicalCountDto.Response getById(Long countId) {
        return toResponse(getCountOrThrow(countId));
    }

    private PhysicalCount getCountOrThrow(Long id) {
        return countRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PhysicalCount", id));
    }

    private PhysicalCountDto.Response toResponse(PhysicalCount pc) {
        List<PhysicalCountLineDto.Response> lines = lineRepository.findByCountId(pc.getId()).stream()
                .map(PhysicalCountLineDto::fromEntity)
                .toList();
        return PhysicalCountDto.fromEntity(pc, lines);
    }
}
