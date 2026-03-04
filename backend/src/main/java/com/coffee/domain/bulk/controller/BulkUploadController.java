package com.coffee.domain.bulk.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.config.CustomUserDetails;
import com.coffee.domain.bulk.dto.BulkUploadDto;
import com.coffee.domain.bulk.service.BulkUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/bulk")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
public class BulkUploadController {

    private final BulkUploadService bulkUploadService;

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate(@RequestParam String type) throws IOException {
        byte[] template = bulkUploadService.generateTemplate(type);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=template_" + type.toLowerCase() + ".xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(template);
    }

    @PostMapping("/upload")
    public ApiResponse<BulkUploadDto.UploadResult> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam String type,
            @AuthenticationPrincipal CustomUserDetails user) throws IOException {
        return ApiResponse.ok(bulkUploadService.upload(file, type, user.getId()));
    }

    @PostMapping("/{batchId}/confirm")
    public ApiResponse<Void> confirm(
            @PathVariable Long batchId,
            @AuthenticationPrincipal CustomUserDetails user) {
        bulkUploadService.confirm(batchId, user.getId());
        return ApiResponse.ok(null, "Batch confirmed");
    }

    @GetMapping("/history")
    public ApiResponse<List<BulkUploadDto.BatchResponse>> getHistory() {
        return ApiResponse.ok(bulkUploadService.getHistory());
    }
}
