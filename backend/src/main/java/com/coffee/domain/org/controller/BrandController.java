package com.coffee.domain.org.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.org.dto.BrandDto;
import com.coffee.domain.org.service.BrandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/org/brands")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandDto.Response>>> findAll(
            @RequestParam(required = false) Long companyId) {
        List<BrandDto.Response> brands = companyId != null
                ? brandService.findByCompanyId(companyId)
                : brandService.findAll();
        return ResponseEntity.ok(ApiResponse.ok(brands));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(brandService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BrandDto.Response>> create(@Valid @RequestBody BrandDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(brandService.create(request), "Brand created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandDto.Response>> update(
            @PathVariable Long id, @Valid @RequestBody BrandDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(brandService.update(id, request), "Brand updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        brandService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Brand deleted"));
    }
}
