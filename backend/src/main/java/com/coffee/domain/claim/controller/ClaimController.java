package com.coffee.domain.claim.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.claim.dto.ClaimDto;
import com.coffee.domain.claim.entity.ClaimType;
import com.coffee.domain.claim.service.ClaimService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/claims")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'STORE_MANAGER', 'JP_ORDERER')")
public class ClaimController {

    private final ClaimService claimService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClaimDto.Response>> createClaim(
            @Valid @RequestBody ClaimDto.CreateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(claimService.createClaim(request, userId), "Claim created"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClaimDto.Response>>> getClaims(
            @RequestParam Long storeId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.getClaims(storeId, status)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClaimDto.Response>> getClaim(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.getClaim(id)));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<ClaimDto.Response>> resolveClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimDto.ResolveRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                claimService.resolveClaim(id, request, userId), "Claim updated"));
    }

    @PostMapping("/{id}/images")
    public ResponseEntity<ApiResponse<ClaimDto.ClaimImageResponse>> addImage(
            @PathVariable Long id,
            @Valid @RequestBody ClaimDto.AddImageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(claimService.addImage(id, request), "Image added"));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<String>>> getClaimTypes() {
        List<String> types = Arrays.stream(ClaimType.values())
                .map(Enum::name)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(types));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<ClaimDto.ClaimSummary>> getSummary(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.getSummary(storeId)));
    }
}
