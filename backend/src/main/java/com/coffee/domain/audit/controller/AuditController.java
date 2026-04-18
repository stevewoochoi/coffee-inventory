package com.coffee.domain.audit.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.audit.dto.AuditDto;
import com.coffee.domain.audit.service.InventoryAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'STORE_MANAGER', 'JP_ORDERER')")
public class AuditController {

    private final InventoryAuditService auditService;

    @PostMapping
    public ResponseEntity<ApiResponse<AuditDto.Response>> createAudit(
            @Valid @RequestBody AuditDto.CreateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(auditService.createAudit(request, userId), "Audit created"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditDto.Response>>> getAudits(
            @RequestParam Long storeId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(auditService.getAudits(storeId, status)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AuditDto.Response>> getAudit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(auditService.getAudit(id)));
    }

    @PutMapping("/lines/{lineId}")
    public ResponseEntity<ApiResponse<AuditDto.AuditLineResponse>> updateLine(
            @PathVariable Long lineId,
            @Valid @RequestBody AuditDto.UpdateLineRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                auditService.updateLine(lineId, request), "Line updated"));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<AuditDto.Response>> completeAudit(
            @PathVariable Long id,
            @RequestBody(required = false) AuditDto.CompleteRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                auditService.completeAudit(id, request, userId), "Audit completed"));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelAudit(@PathVariable Long id) {
        auditService.cancelAudit(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Audit cancelled"));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AuditDto.AuditSummary>> getSummary(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(auditService.getSummary(storeId)));
    }
}
