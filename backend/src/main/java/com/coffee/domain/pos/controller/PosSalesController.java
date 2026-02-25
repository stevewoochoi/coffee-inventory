package com.coffee.domain.pos.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.pos.dto.PosSalesDto;
import com.coffee.domain.pos.service.PosSalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/pos/sales")
@RequiredArgsConstructor
public class PosSalesController {

    private final PosSalesService posSalesService;

    @PostMapping
    public ResponseEntity<ApiResponse<PosSalesDto.Response>> recordSale(
            @Valid @RequestBody PosSalesDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(posSalesService.recordSale(request), "Sale recorded"));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<List<PosSalesDto.Response>>> getSummary(
            @RequestParam Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(posSalesService.getSummary(storeId, date)));
    }
}
