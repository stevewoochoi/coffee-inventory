package com.coffee.domain.org.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

public class UserDto {

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private String email;
        private String name;
        private String role;
        private Long companyId;
        private Long brandId;
        private Long storeId;
        private String accountStatus;
        private Boolean isActive;
        private LocalDateTime registeredAt;
        private LocalDateTime approvedAt;
        private Long approvedBy;
        private String rejectedReason;
        private List<UserStoreInfo> stores;
    }

    @Getter
    @Builder
    public static class UserStoreInfo {
        private Long storeId;
        private String storeName;
        private Boolean isPrimary;
    }

    @Getter
    @Setter
    public static class ApproveRequest {
        @NotNull(message = "Role is required")
        private String role;
        private Long brandId;
        private List<Long> storeIds;
    }

    @Getter
    @Setter
    public static class RejectRequest {
        @NotBlank(message = "Reason is required")
        private String reason;
    }

    @Getter
    @Builder
    public static class ListResponse {
        private List<Response> content;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }
}
