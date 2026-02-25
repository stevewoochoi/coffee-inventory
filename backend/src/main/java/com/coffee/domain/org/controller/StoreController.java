package com.coffee.domain.org.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.org.dto.StoreDto;
import com.coffee.domain.org.service.StoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/org/stores")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class StoreController {

    private final StoreService storeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StoreDto.Response>>> findAll(
            @RequestParam(required = false) Long brandId) {
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
    public ResponseEntity<ApiResponse<StoreDto.Response>> create(@Valid @RequestBody StoreDto.Request request) {
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
