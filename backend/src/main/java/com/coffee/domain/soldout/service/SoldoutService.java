package com.coffee.domain.soldout.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.soldout.dto.SoldoutDto;
import com.coffee.domain.soldout.entity.SoldoutItem;
import com.coffee.domain.soldout.repository.SoldoutItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SoldoutService {

    private final SoldoutItemRepository soldoutRepository;
    private final ItemRepository itemRepository;

    public SoldoutDto.ListResponse getSoldoutProducts(Long storeId, boolean activeOnly) {
        List<SoldoutItem> items;
        if (activeOnly) {
            items = soldoutRepository.findByStoreIdAndIsActiveTrueOrderByRegisteredAtDesc(storeId);
        } else {
            items = soldoutRepository.findByStoreIdOrderByRegisteredAtDesc(storeId);
        }

        List<SoldoutDto.Response> responses = items.stream()
                .map(this::toResponse)
                .toList();

        long activeCount = soldoutRepository.countByStoreIdAndIsActiveTrue(storeId);

        return SoldoutDto.ListResponse.builder()
                .items(responses)
                .activeCount(activeCount)
                .build();
    }

    @Transactional
    public SoldoutDto.Response registerSoldout(SoldoutDto.RegisterRequest request, Long userId) {
        // Check if already marked as soldout
        soldoutRepository.findByStoreIdAndItemIdAndIsActiveTrue(request.getStoreId(), request.getItemId())
                .ifPresent(existing -> {
                    throw new BusinessException("Item is already marked as sold out", HttpStatus.BAD_REQUEST);
                });

        // Verify item exists
        itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item", request.getItemId()));

        SoldoutItem soldout = SoldoutItem.builder()
                .storeId(request.getStoreId())
                .itemId(request.getItemId())
                .reason(request.getReason())
                .registeredBy(userId)
                .build();
        soldoutRepository.save(soldout);

        return toResponse(soldout);
    }

    @Transactional
    public void resolveSoldout(Long soldoutId) {
        SoldoutItem soldout = soldoutRepository.findById(soldoutId)
                .orElseThrow(() -> new ResourceNotFoundException("SoldoutItem", soldoutId));

        if (!soldout.getIsActive()) {
            throw new BusinessException("Soldout item is already resolved", HttpStatus.BAD_REQUEST);
        }

        soldout.setIsActive(false);
        soldout.setResolvedAt(LocalDateTime.now());
        soldoutRepository.save(soldout);
    }

    private SoldoutDto.Response toResponse(SoldoutItem item) {
        String itemName = itemRepository.findById(item.getItemId())
                .map(Item::getName).orElse(null);

        return SoldoutDto.Response.builder()
                .id(item.getId())
                .storeId(item.getStoreId())
                .itemId(item.getItemId())
                .itemName(itemName)
                .reason(item.getReason())
                .registeredBy(item.getRegisteredBy())
                .registeredAt(item.getRegisteredAt())
                .resolvedAt(item.getResolvedAt())
                .isActive(item.getIsActive())
                .build();
    }
}
