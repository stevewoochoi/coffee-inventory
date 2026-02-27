package com.coffee.domain.audit.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AuditDto {

    @Getter
    @Setter
    public static class CreateRequest {
        @NotNull private Long storeId;
        private String note;
    }

    @Getter
    @Setter
    public static class UpdateLineRequest {
        @NotNull private BigDecimal actualQty;
        private String note;
    }

    @Getter
    @Setter
    public static class CompleteRequest {
        private String note;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long storeId;
        private LocalDate auditDate;
        private String status;
        private Long createdBy;
        private Long completedBy;
        private LocalDateTime completedAt;
        private String note;
        private List<AuditLineResponse> lines;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class AuditLineResponse {
        private Long id;
        private Long itemId;
        private String itemName;
        private BigDecimal systemQty;
        private BigDecimal actualQty;
        private BigDecimal difference;
        private String note;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class AuditSummary {
        private long inProgress;
        private long completed;
        private long total;
    }
}
