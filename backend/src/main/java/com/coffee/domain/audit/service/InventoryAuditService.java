package com.coffee.domain.audit.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.audit.dto.AuditDto;
import com.coffee.domain.audit.entity.AuditStatus;
import com.coffee.domain.audit.entity.InventoryAudit;
import com.coffee.domain.audit.entity.InventoryAuditLine;
import com.coffee.domain.audit.repository.InventoryAuditLineRepository;
import com.coffee.domain.audit.repository.InventoryAuditRepository;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryAuditService {

    private final InventoryAuditRepository auditRepository;
    private final InventoryAuditLineRepository auditLineRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final InventoryService inventoryService;
    private final ItemRepository itemRepository;

    @Transactional
    public AuditDto.Response createAudit(AuditDto.CreateRequest request, Long userId) {
        // Check no in-progress audit for this store
        long inProgress = auditRepository.countByStoreIdAndStatus(request.getStoreId(), AuditStatus.IN_PROGRESS);
        if (inProgress > 0) {
            throw new BusinessException("An audit is already in progress for this store", HttpStatus.BAD_REQUEST);
        }

        InventoryAudit audit = InventoryAudit.builder()
                .storeId(request.getStoreId())
                .auditDate(LocalDate.now())
                .createdBy(userId)
                .note(request.getNote())
                .build();
        auditRepository.save(audit);

        // Auto-generate lines from current snapshot
        List<InventorySnapshot> snapshots = snapshotRepository.findByStoreId(request.getStoreId());

        // Aggregate by itemId (sum across lots)
        Map<Long, BigDecimal> stockByItem = snapshots.stream()
                .collect(Collectors.groupingBy(
                        InventorySnapshot::getItemId,
                        Collectors.reducing(BigDecimal.ZERO, InventorySnapshot::getQtyBaseUnit, BigDecimal::add)
                ));

        for (Map.Entry<Long, BigDecimal> entry : stockByItem.entrySet()) {
            auditLineRepository.save(InventoryAuditLine.builder()
                    .auditId(audit.getId())
                    .itemId(entry.getKey())
                    .systemQty(entry.getValue())
                    .build());
        }

        return toResponse(audit);
    }

    public List<AuditDto.Response> getAudits(Long storeId, String status) {
        List<InventoryAudit> audits;
        if (status != null && !status.isEmpty()) {
            audits = auditRepository.findByStoreIdAndStatus(storeId, AuditStatus.valueOf(status));
        } else {
            audits = auditRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        }
        return audits.stream().map(this::toResponse).toList();
    }

    public AuditDto.Response getAudit(Long auditId) {
        InventoryAudit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryAudit", auditId));
        return toResponse(audit);
    }

    @Transactional
    public AuditDto.AuditLineResponse updateLine(Long lineId, AuditDto.UpdateLineRequest request) {
        InventoryAuditLine line = auditLineRepository.findById(lineId)
                .orElseThrow(() -> new ResourceNotFoundException("AuditLine", lineId));

        InventoryAudit audit = auditRepository.findById(line.getAuditId())
                .orElseThrow(() -> new ResourceNotFoundException("InventoryAudit", line.getAuditId()));

        if (audit.getStatus() != AuditStatus.IN_PROGRESS) {
            throw new BusinessException("Audit is not in progress", HttpStatus.BAD_REQUEST);
        }

        line.setActualQty(request.getActualQty());
        line.setDifference(request.getActualQty().subtract(line.getSystemQty()));
        if (request.getNote() != null) {
            line.setNote(request.getNote());
        }
        auditLineRepository.save(line);

        return toLineResponse(line);
    }

    @Transactional
    public AuditDto.Response completeAudit(Long auditId, AuditDto.CompleteRequest request, Long userId) {
        InventoryAudit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryAudit", auditId));

        if (audit.getStatus() != AuditStatus.IN_PROGRESS) {
            throw new BusinessException("Audit is not in progress", HttpStatus.BAD_REQUEST);
        }

        List<InventoryAuditLine> lines = auditLineRepository.findByAuditId(auditId);

        // Apply stock adjustments for lines with differences
        for (InventoryAuditLine line : lines) {
            if (line.getDifference() != null && line.getDifference().compareTo(BigDecimal.ZERO) != 0) {
                inventoryService.recordStockChange(
                        audit.getStoreId(),
                        line.getItemId(),
                        line.getDifference(),
                        LedgerType.ADJUST,
                        "AUDIT",
                        auditId,
                        "Inventory audit #" + auditId,
                        userId
                );
            }
        }

        audit.setStatus(AuditStatus.COMPLETED);
        audit.setCompletedBy(userId);
        audit.setCompletedAt(LocalDateTime.now());
        if (request != null && request.getNote() != null) {
            audit.setNote(request.getNote());
        }
        auditRepository.save(audit);

        return toResponse(audit);
    }

    @Transactional
    public void cancelAudit(Long auditId) {
        InventoryAudit audit = auditRepository.findById(auditId)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryAudit", auditId));

        if (audit.getStatus() != AuditStatus.IN_PROGRESS) {
            throw new BusinessException("Only in-progress audits can be cancelled", HttpStatus.BAD_REQUEST);
        }

        audit.setStatus(AuditStatus.CANCELLED);
        auditRepository.save(audit);
    }

    public AuditDto.AuditSummary getSummary(Long storeId) {
        long inProgress = auditRepository.countByStoreIdAndStatus(storeId, AuditStatus.IN_PROGRESS);
        long completed = auditRepository.countByStoreIdAndStatus(storeId, AuditStatus.COMPLETED);
        return AuditDto.AuditSummary.builder()
                .inProgress(inProgress)
                .completed(completed)
                .total(inProgress + completed)
                .build();
    }

    private AuditDto.Response toResponse(InventoryAudit audit) {
        List<InventoryAuditLine> lines = auditLineRepository.findByAuditId(audit.getId());
        List<AuditDto.AuditLineResponse> lineResponses = lines.stream()
                .map(this::toLineResponse)
                .toList();

        return AuditDto.Response.builder()
                .id(audit.getId())
                .storeId(audit.getStoreId())
                .auditDate(audit.getAuditDate())
                .status(audit.getStatus().name())
                .createdBy(audit.getCreatedBy())
                .completedBy(audit.getCompletedBy())
                .completedAt(audit.getCompletedAt())
                .note(audit.getNote())
                .lines(lineResponses)
                .createdAt(audit.getCreatedAt())
                .build();
    }

    private AuditDto.AuditLineResponse toLineResponse(InventoryAuditLine line) {
        String itemName = itemRepository.findById(line.getItemId())
                .map(Item::getName).orElse(null);
        return AuditDto.AuditLineResponse.builder()
                .id(line.getId())
                .itemId(line.getItemId())
                .itemName(itemName)
                .systemQty(line.getSystemQty())
                .actualQty(line.getActualQty())
                .difference(line.getDifference())
                .note(line.getNote())
                .build();
    }
}
