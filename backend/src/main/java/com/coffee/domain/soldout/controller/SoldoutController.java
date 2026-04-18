package com.coffee.domain.soldout.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.soldout.dto.SoldoutDto;
import com.coffee.domain.soldout.service.SoldoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/soldout")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'STORE_MANAGER', 'JP_ORDERER')")
public class SoldoutController {

    private final SoldoutService soldoutService;

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<SoldoutDto.ListResponse>> getSoldoutProducts(
            @RequestParam Long storeId,
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        return ResponseEntity.ok(ApiResponse.ok(
                soldoutService.getSoldoutProducts(storeId, activeOnly)));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<SoldoutDto.Response>> registerSoldout(
            @Valid @RequestBody SoldoutDto.RegisterRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(
                        soldoutService.registerSoldout(request, userId),
                        "Item marked as sold out"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> resolveSoldout(@PathVariable Long id) {
        soldoutService.resolveSoldout(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Soldout resolved"));
    }
}
