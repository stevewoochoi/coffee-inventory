package com.coffee.domain.master.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.master.dto.ItemDto;
import com.coffee.domain.master.service.ItemService;
import com.coffee.domain.upload.dto.UploadDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/master/items")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ItemDto.Response>>> findAll(
            @RequestParam(required = false) Long brandId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.findAll(brandId, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ItemDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ItemDto.Response>> create(@Valid @RequestBody ItemDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(itemService.create(request), "Item created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ItemDto.Response>> update(
            @PathVariable Long id, @Valid @RequestBody ItemDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.update(id, request), "Item updated"));
    }

    @PutMapping("/{id}/min-stock")
    public ResponseEntity<ApiResponse<ItemDto.Response>> updateMinStock(
            @PathVariable Long id, @Valid @RequestBody ItemDto.MinStockRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.updateMinStock(id, request), "Min stock updated"));
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<ApiResponse<ItemDto.Response>> updateImage(
            @PathVariable Long id, @RequestBody UploadDto.ImageRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.updateImage(id, request.getImageUrl()), "Image updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        itemService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Item deactivated"));
    }
}
