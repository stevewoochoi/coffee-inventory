package com.coffee.domain.upload.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

public class UploadDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class PresignedUrlResponse {
        private String uploadUrl;
        private String fileUrl;
        private String key;
    }

    @Getter
    @Setter
    public static class ImageRequest {
        private String imageUrl;
    }
}
