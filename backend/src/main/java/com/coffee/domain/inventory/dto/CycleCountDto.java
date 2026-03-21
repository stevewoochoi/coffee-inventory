package com.coffee.domain.inventory.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CycleCountDto {

    @Getter
    @Builder
    public static class SessionResponse {
        private Long id;
        private Long storeId;
        private String gradeFilter;
        private String zoneFilter;
        private String status;
        private Long countedBy;
        private Integer itemCount;
        private Integer completedCount;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private String note;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    public static class SessionDetailResponse {
        private Long id;
        private Long storeId;
        private String gradeFilter;
        private String zoneFilter;
        private String status;
        private Long countedBy;
        private Integer itemCount;
        private Integer completedCount;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private String note;
        private LocalDateTime createdAt;
        private List<LineResponse> lines;
    }

    @Getter
    @Builder
    public static class LineResponse {
        private Long id;
        private Long sessionId;
        private Long itemId;
        private String itemName;
        private String itemNameJa;
        private BigDecimal systemQty;
        private BigDecimal countedQty;
        private BigDecimal varianceQty;
        private String stockUnit;
        private String storageZone;
        private String itemGrade;
        private Boolean isAdjusted;
        private LocalDateTime adjustedAt;
        private String note;
    }

    @Getter
    @Setter
    public static class UpdateLineRequest {
        private Double countedQty;
        private String note;
    }

    @Getter
    @Setter
    public static class CompleteRequest {
        private Boolean applyAdjustments;
    }
}
