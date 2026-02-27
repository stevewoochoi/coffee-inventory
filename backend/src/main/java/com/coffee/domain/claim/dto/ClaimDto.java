package com.coffee.domain.claim.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

public class ClaimDto {

    @Getter
    @Setter
    public static class CreateRequest {
        @NotNull private Long storeId;
        private Long orderPlanId;
        private Long deliveryId;
        @NotNull private String claimType;
        private String description;
        private String requestedAction;
        private List<ClaimLineInput> lines;
    }

    @Getter
    @Setter
    public static class ClaimLineInput {
        @NotNull private Long itemId;
        private Long packagingId;
        @NotNull private Integer claimedQty;
        private String reason;
    }

    @Getter
    @Setter
    public static class ResolveRequest {
        @NotNull private String status;
        private String resolutionNote;
        private List<AcceptedLineInput> lines;
    }

    @Getter
    @Setter
    public static class AcceptedLineInput {
        @NotNull private Long claimLineId;
        @NotNull private Integer acceptedQty;
    }

    @Getter
    @Setter
    public static class AddImageRequest {
        @NotNull private String imageUrl;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long storeId;
        private Long orderPlanId;
        private Long deliveryId;
        private String claimType;
        private String status;
        private String description;
        private String requestedAction;
        private Long createdBy;
        private Long resolvedBy;
        private LocalDateTime resolvedAt;
        private String resolutionNote;
        private List<ClaimLineResponse> lines;
        private List<ClaimImageResponse> images;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ClaimLineResponse {
        private Long id;
        private Long itemId;
        private String itemName;
        private Long packagingId;
        private String packName;
        private Integer claimedQty;
        private Integer acceptedQty;
        private String reason;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ClaimImageResponse {
        private Long id;
        private String imageUrl;
        private LocalDateTime uploadedAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ClaimSummary {
        private long submitted;
        private long inReview;
        private long resolved;
        private long total;
    }
}
