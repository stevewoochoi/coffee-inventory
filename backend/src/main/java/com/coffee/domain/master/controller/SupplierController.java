package com.coffee.domain.master.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.master.dto.SupplierDto;
import com.coffee.domain.master.dto.SupplierItemDto;
import com.coffee.domain.master.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/suppliers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SupplierDto.Response>>> findAll(
            @RequestParam(required = false) Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.findAll(brandId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupplierDto.Response>> create(
            @Valid @RequestBody SupplierDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(supplierService.create(request), "Supplier created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierDto.Response>> update(
            @PathVariable Long id, @Valid @RequestBody SupplierDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.update(id, request), "Supplier updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Supplier deleted"));
    }

    // SupplierItem endpoints
    @GetMapping("/{supplierId}/items")
    public ResponseEntity<ApiResponse<List<SupplierItemDto.Response>>> findSupplierItems(
            @PathVariable Long supplierId) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.findSupplierItems(supplierId)));
    }

    @PostMapping("/{supplierId}/items")
    public ResponseEntity<ApiResponse<SupplierItemDto.Response>> createSupplierItem(
            @PathVariable Long supplierId, @Valid @RequestBody SupplierItemDto.Request request) {
        request.setSupplierId(supplierId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(supplierService.createSupplierItem(request), "Supplier item created"));
    }

    @DeleteMapping("/{supplierId}/items/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteSupplierItem(
            @PathVariable Long supplierId, @PathVariable Long itemId) {
        supplierService.deleteSupplierItem(itemId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Supplier item deleted"));
    }
}
