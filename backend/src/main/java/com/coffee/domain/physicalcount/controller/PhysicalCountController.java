package com.coffee.domain.physicalcount.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.physicalcount.dto.PhysicalCountDto;
import com.coffee.domain.physicalcount.dto.PhysicalCountLineDto;
import com.coffee.domain.physicalcount.service.PhysicalCountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/physical-count")
@RequiredArgsConstructor
public class PhysicalCountController {

    private final PhysicalCountService physicalCountService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<PhysicalCountDto.Response>> start(
            @RequestBody PhysicalCountDto.StartRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(physicalCountService.startCount(request)));
    }

    @PutMapping("/{id}/lines/{lineId}")
    public ResponseEntity<ApiResponse<PhysicalCountLineDto.Response>> updateLine(
            @PathVariable Long id,
            @PathVariable Long lineId,
            @RequestBody PhysicalCountLineDto.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(physicalCountService.updateLine(id, lineId, request)));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<PhysicalCountDto.Response>> complete(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(physicalCountService.completeCount(id)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PhysicalCountDto.Response>>> history(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(physicalCountService.getHistory(storeId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PhysicalCountDto.Response>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(physicalCountService.getById(id)));
    }
}
