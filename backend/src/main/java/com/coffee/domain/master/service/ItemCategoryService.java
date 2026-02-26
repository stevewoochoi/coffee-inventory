package com.coffee.domain.master.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.dto.ItemCategoryDto;
import com.coffee.domain.master.entity.ItemCategory;
import com.coffee.domain.master.repository.ItemCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemCategoryService {

    private final ItemCategoryRepository categoryRepository;

    public List<ItemCategoryDto.Response> findByBrandId(Long brandId) {
        return categoryRepository.findByBrandIdAndIsActiveTrueOrderByDisplayOrderAsc(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ItemCategoryDto.Response> findAllByBrandId(Long brandId) {
        return categoryRepository.findByBrandIdOrderByDisplayOrderAsc(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ItemCategoryDto.Response create(ItemCategoryDto.Request request) {
        categoryRepository.findByBrandIdAndName(request.getBrandId(), request.getName())
                .ifPresent(existing -> {
                    throw new BusinessException("Category already exists: " + request.getName(), HttpStatus.CONFLICT);
                });

        ItemCategory category = ItemCategory.builder()
                .brandId(request.getBrandId())
                .name(request.getName())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public ItemCategoryDto.Response update(Long id, ItemCategoryDto.Request request) {
        ItemCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ItemCategory", id));

        category.setName(request.getName());
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        ItemCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ItemCategory", id));
        category.setIsActive(false);
        categoryRepository.save(category);
    }

    private ItemCategoryDto.Response toResponse(ItemCategory c) {
        return ItemCategoryDto.Response.builder()
                .id(c.getId())
                .brandId(c.getBrandId())
                .name(c.getName())
                .displayOrder(c.getDisplayOrder())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
