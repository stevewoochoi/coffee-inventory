package com.coffee.domain.upload.service;

import com.coffee.domain.upload.dto.UploadDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.Duration;
import java.util.UUID;

@Service
@Slf4j
public class UploadService {

    private final S3Presigner s3Presigner;

    @Value("${app.aws.s3.bucket:coffee-inventory-files}")
    private String bucket;

    @Value("${app.aws.region:ap-northeast-1}")
    private String region;

    public UploadService(@Autowired(required = false) S3Presigner s3Presigner) {
        this.s3Presigner = s3Presigner;
        if (s3Presigner == null) {
            log.warn("S3Presigner not configured - image upload will not work");
        }
    }

    public UploadDto.PresignedUrlResponse generatePresignedUrl(String fileName, String contentType) {
        // Sanitize fileName: extract only the file name part, remove path separators
        String sanitized = fileName.replaceAll(".*[/\\\\]", "").replaceAll("[^a-zA-Z0-9._-]", "_");
        if (sanitized.isBlank()) sanitized = "file";
        String key = "images/" + UUID.randomUUID() + "/" + sanitized;
        String fileUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);

        if (s3Presigner == null) {
            log.warn("S3 not configured, returning stub URL");
            return UploadDto.PresignedUrlResponse.builder()
                    .uploadUrl(fileUrl)
                    .fileUrl(fileUrl)
                    .key(key)
                    .build();
        }

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .putObjectRequest(putObjectRequest)
                .signatureDuration(Duration.ofMinutes(10))
                .build();

        String uploadUrl = s3Presigner.presignPutObject(presignRequest).url().toString();

        log.debug("Generated presigned URL for key={}", key);

        return UploadDto.PresignedUrlResponse.builder()
                .uploadUrl(uploadUrl)
                .fileUrl(fileUrl)
                .key(key)
                .build();
    }
}
