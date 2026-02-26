package com.coffee.domain.org.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.org.dto.UserDto;
import com.coffee.domain.org.entity.Role;
import com.coffee.domain.org.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<UserDto.ListResponse>> getUsers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UserDto.ListResponse response = adminUserService.getUsers(
                status, role, search, page, size,
                currentUser.getId(), Role.valueOf(currentUser.getRole()), currentUser.getBrandId());

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto.Response>> getUser(
            @PathVariable Long id) {
        UserDto.Response response = adminUserService.getUser(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<UserDto.Response>> approveUser(
            @PathVariable Long id,
            @Valid @RequestBody UserDto.ApproveRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UserDto.Response response = adminUserService.approveUser(
                id, request,
                currentUser.getId(), Role.valueOf(currentUser.getRole()), currentUser.getBrandId());

        return ResponseEntity.ok(ApiResponse.ok(response, "User approved"));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<UserDto.Response>> rejectUser(
            @PathVariable Long id,
            @Valid @RequestBody UserDto.RejectRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UserDto.Response response = adminUserService.rejectUser(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "User rejected"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto.Response>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserDto.UpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UserDto.Response response = adminUserService.updateUser(
                id, request,
                currentUser.getId(), Role.valueOf(currentUser.getRole()), currentUser.getBrandId());

        return ResponseEntity.ok(ApiResponse.ok(response, "User updated"));
    }

    @PutMapping("/{id}/suspend")
    public ResponseEntity<ApiResponse<UserDto.Response>> suspendUser(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UserDto.Response response = adminUserService.suspendUser(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "User suspended"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        adminUserService.deleteUser(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(null, "User deleted"));
    }

    @PutMapping("/{id}/stores")
    public ResponseEntity<ApiResponse<UserDto.Response>> updateUserStores(
            @PathVariable Long id,
            @Valid @RequestBody UserDto.UserStoresUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UserDto.Response response = adminUserService.updateUserStores(
                id, request, Role.valueOf(currentUser.getRole()), currentUser.getBrandId());

        return ResponseEntity.ok(ApiResponse.ok(response, "User stores updated"));
    }
}
