package com.coffee.domain.inventory.controller;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.inventory.dto.DailyPhysicalCountDto;
import com.coffee.domain.inventory.service.DailyPhysicalCountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/daily-counts")
@RequiredArgsConstructor
public class DailyPhysicalCountController {

    private final DailyPhysicalCountService service;

    @GetMapping("/monthly")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','BRAND_ADMIN','SUPER_ADMIN')")
    public ApiResponse<DailyPhysicalCountDto.MonthlyResponse> getMonthly(
            @RequestParam Long storeId,
            @RequestParam int year,
            @RequestParam int month,
            @AuthenticationPrincipal CustomUserDetails user) {
        validateStoreAccess(user, storeId);
        return ApiResponse.ok(service.getMonthlyCount(storeId, year, month));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('STORE_MANAGER','BRAND_ADMIN','SUPER_ADMIN')")
    public ApiResponse<DailyPhysicalCountDto.SaveResponse> save(
            @Valid @RequestBody DailyPhysicalCountDto.SaveRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long storeId = user.getStoreId();
        return ApiResponse.ok(service.saveCount(request, storeId, user.getId()));
    }

    private void validateStoreAccess(CustomUserDetails user, Long storeId) {
        if ("STORE_MANAGER".equals(user.getRole()) && !storeId.equals(user.getStoreId())) {
            throw new BusinessException("Access denied to this store", HttpStatus.FORBIDDEN, "STORE_ACCESS_DENIED");
        }
    }
}
