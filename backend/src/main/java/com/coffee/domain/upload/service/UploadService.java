package com.coffee.domain.upload.service;

import com.coffee.domain.upload.dto.UploadDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UploadService {

    @Value("${app.s3.bucket:coffee-inventory-uploads}")
    private String bucket;

    @Value("${app.s3.region:ap-northeast-1}")
    private String region;

    /**
     * S3 presigned URL 발급 (실제 S3 연동 시 AWS SDK 사용)
     * 현재는 URL 형식만 반환하는 스텁 구현
     */
    public UploadDto.PresignedUrlResponse generatePresignedUrl(String fileName, String contentType) {
        String key = "images/" + UUID.randomUUID() + "/" + fileName;
        String fileUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);

        // TODO: 실제 S3 presigned URL 생성 (AWS SDK)
        // 현재는 fileUrl을 uploadUrl로 반환
        return UploadDto.PresignedUrlResponse.builder()
                .uploadUrl(fileUrl)
                .fileUrl(fileUrl)
                .key(key)
                .build();
    }
}
