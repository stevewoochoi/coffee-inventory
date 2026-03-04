package com.coffee.domain.bulk.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class BulkUploadDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class UploadResult {
        private Long batchId;
        private int totalRows;
        private int validRows;
        private int errorRows;
        private List<RowError> errors;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class RowError {
        private int row;
        private String column;
        private String message;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class BatchResponse {
        private Long id;
        private String uploadType;
        private String fileName;
        private String status;
        private int totalRows;
        private int successCount;
        private int failCount;
        private LocalDateTime createdAt;
        private LocalDateTime confirmedAt;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PreviewResponse {
        private Long batchId;
        private int totalRows;
        private List<List<String>> headers;
        private List<List<String>> rows;
    }
}
