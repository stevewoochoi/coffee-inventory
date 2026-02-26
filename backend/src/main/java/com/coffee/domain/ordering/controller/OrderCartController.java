package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.ordering.dto.OrderCartDto;
import com.coffee.domain.ordering.service.OrderCartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ordering/cart")
@RequiredArgsConstructor
public class OrderCartController {

    private final OrderCartService cartService;

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

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> updateItem(
            @RequestParam Long storeId,
            @RequestParam Long userId,
            @PathVariable Long itemId,
            @Valid @RequestBody OrderCartDto.UpdateItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.updateItem(storeId, userId, itemId, request)));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> removeItem(
            @RequestParam Long storeId,
            @RequestParam Long userId,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.removeItem(storeId, userId, itemId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> clearCart(
            @RequestParam Long storeId,
            @RequestParam Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.clearCart(storeId, userId)));
    }

    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<OrderCartDto.ConfirmResponse>> confirmCart(
            @RequestParam Long storeId,
            @RequestParam Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.confirmCart(storeId, userId), "Cart confirmed"));
    }
}
