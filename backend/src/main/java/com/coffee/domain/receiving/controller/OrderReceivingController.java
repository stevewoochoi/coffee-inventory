package com.coffee.domain.receiving.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.receiving.dto.DeliveryDto;
import com.coffee.domain.receiving.dto.OrderReceivingDto;
import com.coffee.domain.receiving.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/receiving")
@RequiredArgsConstructor
public class OrderReceivingController {

    private final DeliveryService deliveryService;

    @GetMapping("/pending-orders")
    public ResponseEntity<ApiResponse<List<OrderReceivingDto.PendingOrderResponse>>> getPendingOrders(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(deliveryService.getPendingOrders(storeId)));
    }

    @PostMapping("/from-order/{orderPlanId}")
    public ResponseEntity<ApiResponse<DeliveryDto.Response>> receiveFromOrder(
            @PathVariable Long orderPlanId,
            @Valid @RequestBody OrderReceivingDto.ReceiveRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(
                deliveryService.receiveFromOrder(orderPlanId, request, user != null ? user.getId() : null),
                "Order received"));
    }
}
