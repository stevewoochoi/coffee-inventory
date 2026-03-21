package com.coffee.domain.inventory.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.inventory.dto.CycleCountDto;
import com.coffee.domain.inventory.service.CycleCountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cycle-count")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STORE_MANAGER', 'KR_INVENTORY', 'BRAND_ADMIN', 'SUPER_ADMIN')")
public class CycleCountController {

    private final CycleCountService cycleCountService;

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<CycleCountDto.SessionDetailResponse>> startSession(
            @RequestParam Long storeId,
            @RequestParam(required = false) String gradeFilter,
            @RequestParam(required = false) String zoneFilter,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(cycleCountService.startSession(storeId, gradeFilter, zoneFilter, userId)));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<CycleCountDto.SessionResponse>>> getActiveSessions(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(cycleCountService.getActiveSessions(storeId)));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<CycleCountDto.SessionDetailResponse>> getSession(
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(cycleCountService.getSession(sessionId)));
    }

    @GetMapping("/sessions/history")
    public ResponseEntity<ApiResponse<Page<CycleCountDto.SessionResponse>>> getHistory(
            @RequestParam Long storeId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(cycleCountService.getHistory(storeId, pageable)));
    }

    @PutMapping("/sessions/{sessionId}/lines/{lineId}")
    public ResponseEntity<ApiResponse<CycleCountDto.LineResponse>> updateLine(
            @PathVariable Long sessionId,
            @PathVariable Long lineId,
            @RequestBody CycleCountDto.UpdateLineRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                cycleCountService.updateLine(lineId, request.getCountedQty(), request.getNote())));
    }

    @PostMapping("/sessions/{sessionId}/complete")
    public ResponseEntity<ApiResponse<CycleCountDto.SessionDetailResponse>> completeSession(
            @PathVariable Long sessionId,
            @RequestBody CycleCountDto.CompleteRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                cycleCountService.completeSession(sessionId, request.getApplyAdjustments())));
    }
}
