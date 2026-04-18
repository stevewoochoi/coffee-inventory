package com.coffee.domain.waste.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.waste.dto.WasteDto;
import com.coffee.domain.waste.service.WasteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/waste")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'STORE_MANAGER', 'JP_ORDERER')")
public class WasteController {

    private final WasteService wasteService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WasteDto.Response>>> findByStoreId(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(wasteService.findByStoreId(storeId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WasteDto.Response>> create(
            @Valid @RequestBody WasteDto.Request request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(wasteService.create(request, user != null ? user.getId() : null),
                        "Waste recorded"));
    }
}
