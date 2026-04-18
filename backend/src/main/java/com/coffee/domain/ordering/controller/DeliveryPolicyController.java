package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.ordering.dto.DeliveryPolicyDto;
import com.coffee.domain.ordering.service.DeliveryPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/ordering")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'STORE_MANAGER', 'JP_ORDERER')")
public class DeliveryPolicyController {

    private final DeliveryPolicyService deliveryPolicyService;

    @GetMapping("/delivery-dates")
    public ResponseEntity<ApiResponse<DeliveryPolicyDto.AvailableDateResponse>> getAvailableDates(
            @RequestParam Long storeId,
            @RequestParam(defaultValue = "14") int maxDays) {
        return ResponseEntity.ok(ApiResponse.ok(
                deliveryPolicyService.getAvailableDates(storeId, maxDays)));
    }

    @GetMapping("/availability")
    public ResponseEntity<ApiResponse<DeliveryPolicyDto.OrderAvailability>> checkAvailability(
            @RequestParam Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deliveryDate) {
        return ResponseEntity.ok(ApiResponse.ok(
                deliveryPolicyService.checkOrderAvailability(storeId, deliveryDate)));
    }
}
