package com.coffee.domain.master.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.master.dto.ItemCategoryDto;
import com.coffee.domain.master.service.ItemCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/categories")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class ItemCategoryController {

    private final ItemCategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ItemCategoryDto.Response>>> findByBrandId(
            @RequestParam Long brandId,
            @RequestParam(required = false) Integer level,
            @RequestParam(required = false) Long parentId) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.findByBrandId(brandId, level, parentId)));
    }

    @GetMapping("/tree")
    public ResponseEntity<ApiResponse<List<ItemCategoryDto.TreeResponse>>> getCategoryTree(
            @RequestParam Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.getCategoryTree(brandId)));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
    public ResponseEntity<ApiResponse<List<ItemCategoryDto.Response>>> findAllByBrandId(
            @RequestParam Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.findAllByBrandId(brandId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
    public ResponseEntity<ApiResponse<ItemCategoryDto.Response>> create(
            @Valid @RequestBody ItemCategoryDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(categoryService.create(request), "Category created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
    public ResponseEntity<ApiResponse<ItemCategoryDto.Response>> update(
            @PathVariable Long id,
            @Valid @RequestBody ItemCategoryDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.update(id, request), "Category updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Category deleted"));
    }
}
