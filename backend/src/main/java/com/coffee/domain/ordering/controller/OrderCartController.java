package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.ordering.dto.OrderCartDto;
import com.coffee.domain.ordering.service.OrderCartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ordering/cart")
@RequiredArgsConstructor
public class OrderCartController {

    private final OrderCartService cartService;

    // ===== NEW: Delivery-date-based cart endpoints =====

    @PostMapping
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> createOrAddToCart(
            @Valid @RequestBody OrderCartDto.CreateCartRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user != null ? user.getId() : 1L;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(cartService.createOrAddToCart(request, userId), "Cart updated"));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<OrderCartDto.CartListResponse>> getActiveCarts(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.getActiveCarts(storeId)));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> updateCartItem(
            @PathVariable Long id,
            @Valid @RequestBody OrderCartDto.UpdateItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.updateCartItem(id, request)));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<ApiResponse<Void>> removeCartItem(@PathVariable Long id) {
        cartService.removeCartItem(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Item removed"));
    }

    @DeleteMapping("/{cartId}")
    public ResponseEntity<ApiResponse<Void>> deleteCart(@PathVariable Long cartId) {
        cartService.deleteCart(cartId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Cart deleted"));
    }

    // ===== EXISTING: Backward-compatible endpoints =====

    @GetMapping
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> getCart(
            @RequestParam Long storeId,
            @RequestParam Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCart(storeId, userId)));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> addItem(
            @RequestParam Long storeId,
            @RequestParam Long userId,
            @Valid @RequestBody OrderCartDto.AddItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(cartService.addItem(storeId, userId, request), "Item added to cart"));
    }

    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<OrderCartDto.ConfirmResponse>> confirmCart(
            @RequestParam Long storeId,
            @RequestParam Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.confirmCart(storeId, userId), "Cart confirmed"));
    }
}
