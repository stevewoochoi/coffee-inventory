package com.coffee.domain.claim.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.claim.dto.ClaimDto;
import com.coffee.domain.claim.entity.*;
import com.coffee.domain.claim.repository.ClaimImageRepository;
import com.coffee.domain.claim.repository.ClaimLineRepository;
import com.coffee.domain.claim.repository.ClaimRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final ClaimLineRepository claimLineRepository;
    private final ClaimImageRepository claimImageRepository;
    private final ItemRepository itemRepository;
    private final PackagingRepository packagingRepository;

    @Transactional
    public ClaimDto.Response createClaim(ClaimDto.CreateRequest request, Long userId) {
        Claim claim = Claim.builder()
                .storeId(request.getStoreId())
                .orderPlanId(request.getOrderPlanId())
                .deliveryId(request.getDeliveryId())
                .claimType(ClaimType.valueOf(request.getClaimType()))
                .description(request.getDescription())
                .requestedAction(request.getRequestedAction())
                .createdBy(userId)
                .build();
        claimRepository.save(claim);

        if (request.getLines() != null) {
            for (ClaimDto.ClaimLineInput lineInput : request.getLines()) {
                claimLineRepository.save(ClaimLine.builder()
                        .claimId(claim.getId())
                        .itemId(lineInput.getItemId())
                        .packagingId(lineInput.getPackagingId())
                        .claimedQty(lineInput.getClaimedQty())
                        .reason(lineInput.getReason())
                        .build());
            }
        }

        return toResponse(claim);
    }

    public List<ClaimDto.Response> getClaims(Long storeId, String status) {
        List<Claim> claims;
        if (status != null && !status.isEmpty()) {
            claims = claimRepository.findByStoreIdAndStatusOrderByCreatedAtDesc(
                    storeId, ClaimStatus.valueOf(status));
        } else {
            claims = claimRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        }
        return claims.stream().map(this::toResponse).toList();
    }

    public ClaimDto.Response getClaim(Long claimId) {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", claimId));
        return toResponse(claim);
    }

    @Transactional
    public ClaimDto.Response resolveClaim(Long claimId, ClaimDto.ResolveRequest request, Long userId) {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", claimId));

        if (claim.getStatus() == ClaimStatus.CLOSED) {
            throw new BusinessException("Claim is already closed", HttpStatus.BAD_REQUEST);
        }

        if (request.getStatus() == null || request.getStatus().isBlank()) {
            throw new BusinessException("Status is required", HttpStatus.BAD_REQUEST);
        }
        ClaimStatus newStatus;
        try {
            newStatus = ClaimStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid status: " + request.getStatus(), HttpStatus.BAD_REQUEST);
        }
        claim.setStatus(newStatus);
        claim.setResolutionNote(request.getResolutionNote());

        if (newStatus == ClaimStatus.RESOLVED || newStatus == ClaimStatus.CLOSED) {
            claim.setResolvedBy(userId);
            claim.setResolvedAt(LocalDateTime.now());
        }

        if (request.getLines() != null) {
            for (ClaimDto.AcceptedLineInput lineInput : request.getLines()) {
                ClaimLine line = claimLineRepository.findById(lineInput.getClaimLineId())
                        .orElseThrow(() -> new ResourceNotFoundException("ClaimLine", lineInput.getClaimLineId()));
                if (lineInput.getAcceptedQty() != null) {
                    line.setAcceptedQty(lineInput.getAcceptedQty());
                }
                claimLineRepository.save(line);
            }
        }

        claimRepository.save(claim);
        return toResponse(claim);
    }

    @Transactional
    public ClaimDto.ClaimImageResponse addImage(Long claimId, ClaimDto.AddImageRequest request) {
        claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim", claimId));

        ClaimImage image = ClaimImage.builder()
                .claimId(claimId)
                .imageUrl(request.getImageUrl())
                .build();
        claimImageRepository.save(image);

        return ClaimDto.ClaimImageResponse.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .uploadedAt(image.getUploadedAt())
                .build();
    }

    public ClaimDto.ClaimSummary getSummary(Long storeId) {
        long submitted = claimRepository.countByStoreIdAndStatus(storeId, ClaimStatus.SUBMITTED);
        long inReview = claimRepository.countByStoreIdAndStatus(storeId, ClaimStatus.IN_REVIEW);
        long resolved = claimRepository.countByStoreIdAndStatus(storeId, ClaimStatus.RESOLVED);
        return ClaimDto.ClaimSummary.builder()
                .submitted(submitted)
                .inReview(inReview)
                .resolved(resolved)
                .total(submitted + inReview + resolved)
                .build();
    }

    private ClaimDto.Response toResponse(Claim claim) {
        List<ClaimLine> lines = claimLineRepository.findByClaimId(claim.getId());
        List<ClaimImage> images = claimImageRepository.findByClaimId(claim.getId());

        List<ClaimDto.ClaimLineResponse> lineResponses = lines.stream().map(line -> {
            String itemName = itemRepository.findById(line.getItemId())
                    .map(Item::getName).orElse(null);
            String packName = line.getPackagingId() != null
                    ? packagingRepository.findById(line.getPackagingId())
                    .map(Packaging::getPackName).orElse(null)
                    : null;
            return ClaimDto.ClaimLineResponse.builder()
                    .id(line.getId())
                    .itemId(line.getItemId())
                    .itemName(itemName)
                    .packagingId(line.getPackagingId())
                    .packName(packName)
                    .claimedQty(line.getClaimedQty())
                    .acceptedQty(line.getAcceptedQty())
                    .reason(line.getReason())
                    .build();
        }).toList();

        List<ClaimDto.ClaimImageResponse> imageResponses = images.stream().map(img ->
                ClaimDto.ClaimImageResponse.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .uploadedAt(img.getUploadedAt())
                        .build()
        ).toList();

        return ClaimDto.Response.builder()
                .id(claim.getId())
                .storeId(claim.getStoreId())
                .orderPlanId(claim.getOrderPlanId())
                .deliveryId(claim.getDeliveryId())
                .claimType(claim.getClaimType().name())
                .status(claim.getStatus().name())
                .description(claim.getDescription())
                .requestedAction(claim.getRequestedAction())
                .createdBy(claim.getCreatedBy())
                .resolvedBy(claim.getResolvedBy())
                .resolvedAt(claim.getResolvedAt())
                .resolutionNote(claim.getResolutionNote())
                .lines(lineResponses)
                .images(imageResponses)
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .build();
    }
}
