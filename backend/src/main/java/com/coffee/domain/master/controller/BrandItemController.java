package com.coffee.domain.master.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.master.dto.BrandItemDto;
import com.coffee.domain.master.service.BrandItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/brand-items")
@RequiredArgsConstructor
public class BrandItemController {

    private final BrandItemService brandItemService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
    public ResponseEntity<ApiResponse<List<BrandItemDto.Response>>> findByBrand(
            @RequestParam Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(brandItemService.findByBrand(brandId)));
    }

    @GetMapping("/by-item/{itemId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<BrandItemDto.Response>>> findByItem(
            @PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.ok(brandItemService.findByItem(itemId)));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<BrandItemDto.Response>> assign(
            @Valid @RequestBody BrandItemDto.AssignRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(brandItemService.assign(request), "Item assigned to brand"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
    public ResponseEntity<ApiResponse<BrandItemDto.Response>> update(
            @PathVariable Long id, @Valid @RequestBody BrandItemDto.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(brandItemService.update(id, request), "Brand item updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> unassign(@PathVariable Long id) {
        brandItemService.unassign(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Item unassigned from brand"));
    }
}
