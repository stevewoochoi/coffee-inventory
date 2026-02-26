package com.coffee.domain.master.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.dto.ItemDto;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.ItemCategory;
import com.coffee.domain.master.repository.ItemCategoryRepository;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemService {

    private final ItemRepository itemRepository;
    private final BrandRepository brandRepository;
    private final ItemCategoryRepository categoryRepository;

    public Page<ItemDto.Response> findAll(Long brandId, Pageable pageable) {
        Page<Item> items = brandId != null
                ? itemRepository.findByBrandIdAndIsActiveTrue(brandId, pageable)
                : itemRepository.findByIsActiveTrue(pageable);
        return items.map(this::toResponse);
    }

    public ItemDto.Response findById(Long id) {
        return toResponse(getActiveItemOrThrow(id));
    }

    @Transactional
    public ItemDto.Response create(ItemDto.Request request) {
        brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", request.getBrandId()));

        Item item = Item.builder()
                .brandId(request.getBrandId())
                .name(request.getName())
                .category(request.getCategory())
                .categoryId(request.getCategoryId())
                .baseUnit(request.getBaseUnit())
                .lossRate(request.getLossRate() != null ? request.getLossRate() : java.math.BigDecimal.ZERO)
                .build();
        return toResponse(itemRepository.save(item));
    }

    @Transactional
    public ItemDto.Response update(Long id, ItemDto.Request request) {
        Item item = getActiveItemOrThrow(id);
        item.setName(request.getName());
        item.setCategory(request.getCategory());
        item.setCategoryId(request.getCategoryId());
        item.setBaseUnit(request.getBaseUnit());
        if (request.getLossRate() != null) {
            item.setLossRate(request.getLossRate());
        }
        if (request.getMinStockQty() != null) {
            item.setMinStockQty(request.getMinStockQty());
        }
        return toResponse(itemRepository.save(item));
    }

    @Transactional
    public ItemDto.Response updateMinStock(Long id, ItemDto.MinStockRequest request) {
        Item item = getActiveItemOrThrow(id);
        item.setMinStockQty(request.getMinStockQty());
        return toResponse(itemRepository.save(item));
    }

    @Transactional
    public ItemDto.Response updateImage(Long id, String imageUrl) {
        Item item = getActiveItemOrThrow(id);
        item.setImageUrl(imageUrl);
        return toResponse(itemRepository.save(item));
    }

    @Transactional
    public void delete(Long id) {
        Item item = getActiveItemOrThrow(id);
        item.setIsActive(false);
        itemRepository.save(item);
    }

    private Item getActiveItemOrThrow(Long id) {
        return itemRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item", id));
    }

    private ItemDto.Response toResponse(Item item) {
        String categoryName = null;
        if (item.getCategoryId() != null) {
            categoryName = categoryRepository.findById(item.getCategoryId())
                    .map(ItemCategory::getName).orElse(null);
        }
        return ItemDto.Response.builder()
                .id(item.getId())
                .brandId(item.getBrandId())
                .name(item.getName())
                .category(item.getCategory())
                .categoryId(item.getCategoryId())
                .categoryName(categoryName)
                .baseUnit(item.getBaseUnit())
                .lossRate(item.getLossRate())
                .minStockQty(item.getMinStockQty())
                .imageUrl(item.getImageUrl())
                .isActive(item.getIsActive())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
