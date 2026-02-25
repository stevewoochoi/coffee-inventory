package com.coffee.domain.push.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.push.dto.PushSubscriptionDto;
import com.coffee.domain.push.service.PushSubscriptionService;
import com.coffee.domain.push.service.WebPushService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
@RequiredArgsConstructor
public class PushController {

    private final PushSubscriptionService pushSubscriptionService;
    private final WebPushService webPushService;

    @GetMapping("/vapid-public-key")
    public ResponseEntity<ApiResponse<Map<String, String>>> getVapidPublicKey() {
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("publicKey", webPushService.getVapidPublicKey())));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<ApiResponse<PushSubscriptionDto.Response>> subscribe(
            @Valid @RequestBody PushSubscriptionDto.SubscribeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(pushSubscriptionService.subscribe(request), "Subscription saved"));
    }
}
