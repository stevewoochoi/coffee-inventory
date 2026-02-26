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

        return ResponseEntity.ok(ApiResponse.ok(response, "사용자가 승인되었습니다"));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<UserDto.Response>> rejectUser(
            @PathVariable Long id,
            @Valid @RequestBody UserDto.RejectRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        UserDto.Response response = adminUserService.rejectUser(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "사용자가 거절되었습니다"));
    }
}
