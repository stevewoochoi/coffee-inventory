package com.coffee.domain.org.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AdminSelectController {

    private final BrandRepository brandRepository;
    private final StoreRepository storeRepository;

    @GetMapping("/brands/select")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBrandsSelect(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<Map<String, Object>> brands;
        if ("BRAND_ADMIN".equals(currentUser.getRole()) && currentUser.getBrandId() != null) {
            brands = brandRepository.findById(currentUser.getBrandId())
                    .map(b -> List.of(Map.<String, Object>of("id", b.getId(), "name", b.getName())))
                    .orElse(List.of());
        } else {
            brands = brandRepository.findAll().stream()
                    .map(b -> Map.<String, Object>of("id", b.getId(), "name", b.getName()))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(brands));
    }

    @GetMapping("/stores/select")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStoresSelect(
            @RequestParam Long brandId) {
        var stores = storeRepository.findByBrandId(brandId).stream()
                .map(s -> Map.<String, Object>of("id", s.getId(), "name", s.getName()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(stores));
    }
}
