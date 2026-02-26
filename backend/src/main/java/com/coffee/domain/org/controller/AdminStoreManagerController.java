package com.coffee.domain.org.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.org.dto.UserDto;
import com.coffee.domain.org.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/stores")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class AdminStoreManagerController {

    private final AdminUserService adminUserService;

    @GetMapping("/{storeId}/managers")
    public ResponseEntity<ApiResponse<List<UserDto.StoreManagerInfo>>> getStoreManagers(
            @PathVariable Long storeId) {

        List<UserDto.StoreManagerInfo> managers = adminUserService.getStoreManagers(storeId);
        return ResponseEntity.ok(ApiResponse.ok(managers));
    }

    @PutMapping("/{storeId}/managers")
    public ResponseEntity<ApiResponse<List<UserDto.StoreManagerInfo>>> updateStoreManagers(
            @PathVariable Long storeId,
            @Valid @RequestBody UserDto.StoreManagersUpdateRequest request) {

        List<UserDto.StoreManagerInfo> managers = adminUserService.updateStoreManagers(storeId, request);
        return ResponseEntity.ok(ApiResponse.ok(managers, "Store managers updated"));
    }
}
