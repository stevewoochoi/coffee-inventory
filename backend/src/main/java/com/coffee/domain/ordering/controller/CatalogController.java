package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.ordering.dto.CatalogDto;
import com.coffee.domain.ordering.service.OrderCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ordering")
@RequiredArgsConstructor
public class CatalogController {

    private final OrderCatalogService catalogService;

    @GetMapping("/catalog")
    public ResponseEntity<ApiResponse<Page<CatalogDto.CatalogItem>>> getCatalog(
            @RequestParam Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deliveryDate,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean lowStockOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                catalogService.getCatalog(storeId, deliveryDate, categoryId, keyword,
                        lowStockOnly, PageRequest.of(page, size))));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CatalogDto.CategoryTree>>> getCategoryTree(
            @RequestParam Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(
                catalogService.getCategoryTree(brandId)));
    }
}
