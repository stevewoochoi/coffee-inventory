package com.coffee.domain.physicalcount.dto;

import com.coffee.domain.physicalcount.entity.PhysicalCount;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PhysicalCountDto {

    @Getter
    @AllArgsConstructor
    public static class StartRequest {
        private Long storeId;
        private Long countedBy;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long storeId;
        private LocalDate countDate;
        private String status;
        private Long countedBy;
        private LocalDateTime completedAt;
        private LocalDateTime createdAt;
        private List<PhysicalCountLineDto.Response> lines;
    }

    public static Response fromEntity(PhysicalCount pc, List<PhysicalCountLineDto.Response> lines) {
        return Response.builder()
                .id(pc.getId())
                .storeId(pc.getStoreId())
                .countDate(pc.getCountDate())
                .status(pc.getStatus().name())
                .countedBy(pc.getCountedBy())
                .completedAt(pc.getCompletedAt())
                .createdAt(pc.getCreatedAt())
                .lines(lines)
                .build();
    }
}
