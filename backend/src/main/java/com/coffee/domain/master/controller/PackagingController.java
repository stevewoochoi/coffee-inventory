package com.coffee.domain.master.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.master.dto.PackagingDto;
import com.coffee.domain.master.service.PackagingService;
import com.coffee.domain.upload.dto.UploadDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/packagings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class PackagingController {

    private final PackagingService packagingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PackagingDto.Response>>> findByItemId(
            @RequestParam Long itemId) {
        return ResponseEntity.ok(ApiResponse.ok(packagingService.findByItemId(itemId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PackagingDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(packagingService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PackagingDto.Response>> create(
            @Valid @RequestBody PackagingDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(packagingService.create(request), "Packaging created"));
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<ApiResponse<PackagingDto.Response>> updateImage(
            @PathVariable Long id, @RequestBody UploadDto.ImageRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                packagingService.updateImage(id, request.getImageUrl()), "Image updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deprecate(@PathVariable Long id) {
        packagingService.deprecate(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Packaging deprecated"));
    }
}
