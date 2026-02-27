package com.coffee.domain.ordering.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.ordering.dto.OrderCartDto;
import com.coffee.domain.ordering.dto.OrderNeedsDto;
import com.coffee.domain.ordering.dto.OrderPlanDto;
import com.coffee.domain.ordering.dto.OrderSuggestionDto;
import com.coffee.domain.ordering.service.OrderCartService;
import com.coffee.domain.ordering.service.OrderConfirmService;
import com.coffee.domain.ordering.service.OrderNeedsService;
import com.coffee.domain.ordering.service.OrderPdfService;
import com.coffee.domain.ordering.service.OrderSuggestionService;
import com.coffee.domain.ordering.service.OrderingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ordering")
@RequiredArgsConstructor
public class OrderingController {

    private final OrderingService orderingService;
    private final OrderConfirmService confirmService;
    private final OrderSuggestionService suggestionService;
    private final OrderNeedsService orderNeedsService;
    private final OrderPdfService orderPdfService;
    private final OrderCartService orderCartService;

    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<OrderPlanDto.Response>>> findByStoreId(
            @RequestParam Long storeId) {
        return ResponseEntity.ok(ApiResponse.ok(orderingService.findByStoreId(storeId)));
    }

    @GetMapping("/plans/{id}")
    public ResponseEntity<ApiResponse<OrderPlanDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(orderingService.findById(id)));
    }

    @GetMapping("/plans/{id}/detail")
    public ResponseEntity<ApiResponse<OrderPlanDto.DetailedResponse>> findByIdDetailed(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(orderingService.findByIdDetailed(id)));
    }

    @PostMapping("/plans")
    public ResponseEntity<ApiResponse<OrderPlanDto.Response>> create(
            @Valid @RequestBody OrderPlanDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(orderingService.create(request), "Order plan created"));
    }

    @PutMapping("/plans/{id}/confirm")
    public ResponseEntity<ApiResponse<OrderPlanDto.Response>> confirm(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(orderingService.confirm(id), "Order confirmed"));
    }

    @PostMapping("/plans/{id}/dispatch")
    public ResponseEntity<ApiResponse<OrderPlanDto.Response>> dispatch(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(orderingService.dispatch(id), "Order dispatched"));
    }

    @GetMapping("/needs")
    public ResponseEntity<ApiResponse<OrderNeedsDto.Response>> getOrderNeeds(
            @RequestParam Long storeId,
            @RequestParam(required = false) Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(orderNeedsService.getOrderNeeds(storeId, brandId)));
    }

    @GetMapping("/suggestion")
    public ResponseEntity<ApiResponse<OrderSuggestionDto.Response>> suggestion(
            @RequestParam Long storeId,
            @RequestParam Long supplierId) {
        return ResponseEntity.ok(ApiResponse.ok(suggestionService.suggest(storeId, supplierId)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<OrderPlanDto.HistoryResponse>>> getOrderHistory(
            @RequestParam Long storeId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(orderingService.getOrderHistory(storeId, limit)));
    }

    @PostMapping("/reorder/{orderId}")
    public ResponseEntity<ApiResponse<OrderCartDto.CartResponse>> reorder(
            @PathVariable Long orderId,
            @RequestParam Long storeId,
            @AuthenticationPrincipal CustomUserDetails user) {
        Long userId = user != null ? user.getId() : 1L;
        return ResponseEntity.ok(ApiResponse.ok(
                orderCartService.copyOrderToCart(storeId, userId, orderId),
                "Order copied to cart"));
    }

    @PostMapping("/cart/{cartId}/confirm")
    public ResponseEntity<ApiResponse<OrderPlanDto.ConfirmCartResponse>> confirmCart(
            @PathVariable Long cartId) {
        return ResponseEntity.ok(ApiResponse.ok(confirmService.confirmCart(cartId), "Cart confirmed"));
    }

    @PostMapping("/plans/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelOrder(@PathVariable Long id) {
        confirmService.cancelOrder(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Order cancelled"));
    }

    @PutMapping("/plans/{id}")
    public ResponseEntity<ApiResponse<OrderPlanDto.Response>> modifyOrder(
            @PathVariable Long id,
            @Valid @RequestBody OrderPlanDto.ModifyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(confirmService.modifyOrder(id, request), "Order modified"));
    }

    @GetMapping("/plans/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        byte[] pdfBytes = orderPdfService.generatePdfForPlan(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "order-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);
        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
