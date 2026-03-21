package com.coffee.domain.upload.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.upload.dto.UploadDto;
import com.coffee.domain.upload.service.UploadService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
@Validated
public class UploadController {

    private static final java.util.Set<String> ALLOWED_CONTENT_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
    );

    private final UploadService uploadService;

    @GetMapping("/presigned-url")
    public ResponseEntity<ApiResponse<UploadDto.PresignedUrlResponse>> getPresignedUrl(
            @RequestParam @NotBlank String fileName,
            @RequestParam(defaultValue = "image/jpeg") String contentType) {
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Unsupported content type: " + contentType, "INVALID_CONTENT_TYPE"));
        }
        return ResponseEntity.ok(ApiResponse.ok(uploadService.generatePresignedUrl(fileName, contentType)));
    }
}
