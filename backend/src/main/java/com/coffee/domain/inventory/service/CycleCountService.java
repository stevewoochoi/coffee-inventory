package com.coffee.domain.inventory.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.inventory.dto.CycleCountDto;
import com.coffee.domain.inventory.entity.CycleCountLine;
import com.coffee.domain.inventory.entity.CycleCountSession;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.CycleCountLineRepository;
import com.coffee.domain.inventory.repository.CycleCountSessionRepository;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CycleCountService {

    private final CycleCountSessionRepository sessionRepository;
    private final CycleCountLineRepository lineRepository;
    private final ItemRepository itemRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final InventoryService inventoryService;

    public CycleCountDto.SessionDetailResponse startSession(Long storeId, String gradeFilter, String zoneFilter, Long userId) {
        // Find target items by grade/zone filter
        List<Item> allItems = itemRepository.findByBrandIdAndIsActiveTrue(
                // Get brandId from store - use all active items for the store's brand
                null, Pageable.unpaged()
        ).getContent();

        // Filter by store's brand - get all active items
        List<Item> targetItems = itemRepository.findAll().stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsActive()))
                .filter(i -> gradeFilter == null || "ALL".equals(gradeFilter) || gradeFilter.equals(i.getItemGrade()))
                .filter(i -> zoneFilter == null || "ALL".equals(zoneFilter) || zoneFilter.equals(i.getStorageZone()))
                .collect(Collectors.toList());

        CycleCountSession session = CycleCountSession.builder()
                .storeId(storeId)
                .gradeFilter(gradeFilter)
                .zoneFilter(zoneFilter)
                .countedBy(userId)
                .itemCount(targetItems.size())
                .completedCount(0)
                .build();
        sessionRepository.save(session);

        List<CycleCountLine> lines = new ArrayList<>();
        for (Item item : targetItems) {
            BigDecimal systemQty = snapshotRepository.sumQtyByStoreIdAndItemId(storeId, item.getId());
            if (systemQty == null) systemQty = BigDecimal.ZERO;

            CycleCountLine line = CycleCountLine.builder()
                    .sessionId(session.getId())
                    .itemId(item.getId())
                    .systemQty(systemQty)
                    .stockUnit(item.getStockUnit())
                    .storageZone(item.getStorageZone())
                    .itemGrade(item.getItemGrade())
                    .build();
            lines.add(line);
        }
        lineRepository.saveAll(lines);

        return toDetailResponse(session, lines);
    }

    public CycleCountDto.LineResponse updateLine(Long lineId, Double countedQty, String note) {
        CycleCountLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new ResourceNotFoundException("CycleCountLine", lineId));

        if (countedQty != null) {
            line.setCountedQty(BigDecimal.valueOf(countedQty));
            line.setVarianceQty(BigDecimal.valueOf(countedQty).subtract(
                    line.getSystemQty() != null ? line.getSystemQty() : BigDecimal.ZERO));
        }
        if (note != null) line.setNote(note);
        lineRepository.save(line);

        // Update session completed count
        CycleCountSession session = sessionRepository.findById(line.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("CycleCountSession", line.getSessionId()));
        long completed = lineRepository.countBySessionIdAndCountedQtyIsNotNull(line.getSessionId());
        session.setCompletedCount((int) completed);
        sessionRepository.save(session);

        return toLineResponse(line);
    }

    public CycleCountDto.SessionDetailResponse completeSession(Long sessionId, Boolean applyAdjustments) {
        CycleCountSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("CycleCountSession", sessionId));

        if (Boolean.TRUE.equals(applyAdjustments)) {
            List<CycleCountLine> lines = lineRepository.findBySessionIdOrderByStorageZoneAscItemGradeAsc(sessionId);
            for (CycleCountLine line : lines) {
                if (line.getVarianceQty() != null && line.getVarianceQty().compareTo(BigDecimal.ZERO) != 0
                        && !Boolean.TRUE.equals(line.getIsAdjusted())) {
                    inventoryService.recordStockChange(
                            session.getStoreId(), line.getItemId(),
                            line.getVarianceQty(), LedgerType.ADJUST,
                            "CYCLE_COUNT", sessionId,
                            "Cycle Count #" + sessionId, session.getCountedBy());
                    line.setIsAdjusted(true);
                    line.setAdjustedAt(LocalDateTime.now());
                }
            }
            lineRepository.saveAll(lines);
        }

        session.setStatus("COMPLETED");
        session.setCompletedAt(LocalDateTime.now());
        sessionRepository.save(session);

        List<CycleCountLine> lines = lineRepository.findBySessionIdOrderByStorageZoneAscItemGradeAsc(sessionId);
        return toDetailResponse(session, lines);
    }

    @Transactional(readOnly = true)
    public List<CycleCountDto.SessionResponse> getActiveSessions(Long storeId) {
        return sessionRepository.findByStoreIdAndStatusOrderByCreatedAtDesc(storeId, "IN_PROGRESS")
                .stream().map(this::toSessionResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CycleCountDto.SessionDetailResponse getSession(Long sessionId) {
        CycleCountSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("CycleCountSession", sessionId));
        List<CycleCountLine> lines = lineRepository.findBySessionIdOrderByStorageZoneAscItemGradeAsc(sessionId);
        return toDetailResponse(session, lines);
    }

    @Transactional(readOnly = true)
    public Page<CycleCountDto.SessionResponse> getHistory(Long storeId, Pageable pageable) {
        return sessionRepository.findByStoreIdOrderByCreatedAtDesc(storeId, pageable)
                .map(this::toSessionResponse);
    }

    private CycleCountDto.SessionResponse toSessionResponse(CycleCountSession s) {
        return CycleCountDto.SessionResponse.builder()
                .id(s.getId()).storeId(s.getStoreId())
                .gradeFilter(s.getGradeFilter()).zoneFilter(s.getZoneFilter())
                .status(s.getStatus()).countedBy(s.getCountedBy())
                .itemCount(s.getItemCount()).completedCount(s.getCompletedCount())
                .startedAt(s.getStartedAt()).completedAt(s.getCompletedAt())
                .note(s.getNote()).createdAt(s.getCreatedAt())
                .build();
    }

    private CycleCountDto.SessionDetailResponse toDetailResponse(CycleCountSession s, List<CycleCountLine> lines) {
        return CycleCountDto.SessionDetailResponse.builder()
                .id(s.getId()).storeId(s.getStoreId())
                .gradeFilter(s.getGradeFilter()).zoneFilter(s.getZoneFilter())
                .status(s.getStatus()).countedBy(s.getCountedBy())
                .itemCount(s.getItemCount()).completedCount(s.getCompletedCount())
                .startedAt(s.getStartedAt()).completedAt(s.getCompletedAt())
                .note(s.getNote()).createdAt(s.getCreatedAt())
                .lines(lines.stream().map(this::toLineResponse).collect(Collectors.toList()))
                .build();
    }

    private CycleCountDto.LineResponse toLineResponse(CycleCountLine l) {
        String itemName = null;
        String itemNameJa = null;
        Item item = itemRepository.findById(l.getItemId()).orElse(null);
        if (item != null) {
            itemName = item.getName();
            itemNameJa = item.getNameJa();
        }
        return CycleCountDto.LineResponse.builder()
                .id(l.getId()).sessionId(l.getSessionId()).itemId(l.getItemId())
                .itemName(itemName).itemNameJa(itemNameJa)
                .systemQty(l.getSystemQty()).countedQty(l.getCountedQty())
                .varianceQty(l.getVarianceQty()).stockUnit(l.getStockUnit())
                .storageZone(l.getStorageZone()).itemGrade(l.getItemGrade())
                .isAdjusted(l.getIsAdjusted()).adjustedAt(l.getAdjustedAt())
                .note(l.getNote())
                .build();
    }
}
