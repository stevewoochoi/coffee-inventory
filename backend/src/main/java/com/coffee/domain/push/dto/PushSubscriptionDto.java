package com.coffee.domain.push.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public class PushSubscriptionDto {

    @Getter
    @Setter
    public static class SubscribeRequest {
        @NotNull private Long userId;
        @NotBlank private String endpoint;
        @NotBlank private String p256dh;
        @NotBlank private String auth;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long userId;
        private String endpoint;
        private LocalDateTime createdAt;
    }
}
