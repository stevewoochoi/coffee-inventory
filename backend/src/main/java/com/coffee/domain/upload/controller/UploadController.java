package com.coffee.domain.upload.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.upload.dto.UploadDto;
import com.coffee.domain.upload.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    @GetMapping("/presigned-url")
    public ResponseEntity<ApiResponse<UploadDto.PresignedUrlResponse>> getPresignedUrl(
            @RequestParam String fileName,
            @RequestParam(defaultValue = "image/jpeg") String contentType) {
        return ResponseEntity.ok(ApiResponse.ok(uploadService.generatePresignedUrl(fileName, contentType)));
    }
}
