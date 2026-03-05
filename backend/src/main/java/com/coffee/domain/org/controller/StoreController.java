package com.coffee.domain.org.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.org.dto.StoreDto;
import com.coffee.domain.org.service.StoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/org/stores")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class StoreController {

    private final StoreService storeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StoreDto.Response>>> findAll(
            @RequestParam(required = false) Long brandId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        // BRAND_ADMIN can only see stores of their own brand
        if ("BRAND_ADMIN".equals(userDetails.getRole()) && userDetails.getBrandId() != null) {
            return ResponseEntity.ok(ApiResponse.ok(storeService.findByBrandId(userDetails.getBrandId())));
        }
        List<StoreDto.Response> stores = brandId != null
                ? storeService.findByBrandId(brandId)
                : storeService.findAll();
        return ResponseEntity.ok(ApiResponse.ok(stores));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StoreDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(storeService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StoreDto.Response>> create(
            @Valid @RequestBody StoreDto.Request request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        // BRAND_ADMIN can only create stores for their own brand
        if ("BRAND_ADMIN".equals(userDetails.getRole()) && userDetails.getBrandId() != null) {
            request.setBrandId(userDetails.getBrandId());
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(storeService.create(request), "Store created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StoreDto.Response>> update(
            @PathVariable Long id, @Valid @RequestBody StoreDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(storeService.update(id, request), "Store updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        storeService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Store deleted"));
    }
}
