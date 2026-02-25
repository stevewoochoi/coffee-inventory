package com.coffee.domain.master.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.dto.PackagingDto;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.PackagingStatus;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PackagingService {

    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;

    public List<PackagingDto.Response> findByItemId(Long itemId) {
        return packagingRepository.findByItemIdAndStatus(itemId, PackagingStatus.ACTIVE).stream()
                .map(this::toResponse)
                .toList();
    }

    public PackagingDto.Response findById(Long id) {
        return toResponse(getActiveOrThrow(id));
    }

    @Transactional
    public PackagingDto.Response create(PackagingDto.Request request) {
        itemRepository.findByIdAndIsActiveTrue(request.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item", request.getItemId()));

        Packaging packaging = Packaging.builder()
                .itemId(request.getItemId())
                .packName(request.getPackName())
                .unitsPerPack(request.getUnitsPerPack())
                .packBarcode(request.getPackBarcode())
                .build();
        return toResponse(packagingRepository.save(packaging));
    }

    @Transactional
    public PackagingDto.Response updateImage(Long id, String imageUrl) {
        Packaging packaging = getActiveOrThrow(id);
        packaging.setImageUrl(imageUrl);
        return toResponse(packagingRepository.save(packaging));
    }

    @Transactional
    public void deprecate(Long id) {
        Packaging packaging = getActiveOrThrow(id);
        packaging.setStatus(PackagingStatus.DEPRECATED);
        packagingRepository.save(packaging);
    }

    private Packaging getActiveOrThrow(Long id) {
        return packagingRepository.findByIdAndStatus(id, PackagingStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Packaging", id));
    }

    private PackagingDto.Response toResponse(Packaging p) {
        return PackagingDto.Response.builder()
                .id(p.getId())
                .itemId(p.getItemId())
                .packName(p.getPackName())
                .unitsPerPack(p.getUnitsPerPack())
                .packBarcode(p.getPackBarcode())
                .imageUrl(p.getImageUrl())
                .status(p.getStatus().name())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
