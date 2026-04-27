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

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemCategoryService {

    private static final int MAX_LEVEL = 3;

    private final ItemCategoryRepository categoryRepository;

    public List<ItemCategoryDto.Response> findByBrandId(Long brandId) {
        return categoryRepository.findByBrandIdAndIsActiveTrueOrderByDisplayOrderAsc(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ItemCategoryDto.Response> findByBrandId(Long brandId, Integer level, Long parentId) {
        if (level != null) {
            return categoryRepository.findByBrandIdAndLevelAndIsActiveTrueOrderByDisplayOrderAsc(brandId, level).stream()
                    .map(this::toResponse)
                    .toList();
        }
        if (parentId != null) {
            return categoryRepository.findByBrandIdAndParentIdAndIsActiveTrueOrderByDisplayOrderAsc(brandId, parentId).stream()
                    .map(this::toResponse)
                    .toList();
        }
        return categoryRepository.findByBrandIdAndIsActiveTrueOrderByDisplayOrderAsc(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ItemCategoryDto.Response> findAllByBrandId(Long brandId) {
        return categoryRepository.findByBrandIdOrderByDisplayOrderAsc(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ItemCategoryDto.TreeResponse> getCategoryTree(Long brandId) {
        List<ItemCategory> categories = categoryRepository.findByBrandIdAndIsActiveTrueOrderByDisplayOrderAsc(brandId);

        Map<Long, List<ItemCategory>> childrenMap = categories.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(ItemCategory::getParentId));

        return categories.stream()
                .filter(c -> c.getParentId() == null)
                .sorted(Comparator.comparingInt(c -> c.getDisplayOrder() != null ? c.getDisplayOrder() : 0))
                .map(c -> buildTreeNode(c, childrenMap))
                .toList();
    }

    @Transactional
    public ItemCategoryDto.Response create(ItemCategoryDto.Request request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new BusinessException("카테고리 이름은 필수입니다", HttpStatus.BAD_REQUEST);
        }
        int level = 1;

        if (request.getParentId() != null) {
            ItemCategory parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category", request.getParentId()));
            level = parent.getLevel() + 1;
            if (level > MAX_LEVEL) {
                throw new BusinessException("Maximum category depth is " + MAX_LEVEL, HttpStatus.BAD_REQUEST);
            }
            // Check duplicate under same parent
            categoryRepository.findByBrandIdAndParentIdAndName(request.getBrandId(), request.getParentId(), request.getName())
                    .ifPresent(existing -> {
                        throw new BusinessException("Category already exists: " + request.getName(), HttpStatus.CONFLICT);
                    });
        } else {
            // Check duplicate among root categories
            categoryRepository.findRootByBrandIdAndName(request.getBrandId(), request.getName())
                    .ifPresent(existing -> {
                        throw new BusinessException("Category already exists: " + request.getName(), HttpStatus.CONFLICT);
                    });
        }

        ItemCategory category = ItemCategory.builder()
                .brandId(request.getBrandId())
                .parentId(request.getParentId())
                .name(request.getName())
                .level(level)
                .code(request.getCode())
                .description(request.getDescription())
                .icon(request.getIcon())
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
        if (request.getCode() != null) {
            category.setCode(request.getCode());
        }
        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }
        if (request.getIcon() != null) {
            category.setIcon(request.getIcon());
        }

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        ItemCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ItemCategory", id));
        softDeleteCascade(category);
    }

    private void softDeleteCascade(ItemCategory category) {
        category.setIsActive(false);
        categoryRepository.save(category);

        List<ItemCategory> children = categoryRepository.findByParentId(category.getId());
        for (ItemCategory child : children) {
            softDeleteCascade(child);
        }
    }

    private ItemCategoryDto.TreeResponse buildTreeNode(ItemCategory category,
                                                        Map<Long, List<ItemCategory>> childrenMap) {
        List<ItemCategory> children = childrenMap.getOrDefault(category.getId(), Collections.emptyList());

        return ItemCategoryDto.TreeResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .level(category.getLevel())
                .code(category.getCode())
                .icon(category.getIcon())
                .displayOrder(category.getDisplayOrder())
                .children(children.stream()
                        .sorted(Comparator.comparingInt(c -> c.getDisplayOrder() != null ? c.getDisplayOrder() : 0))
                        .map(c -> buildTreeNode(c, childrenMap))
                        .toList())
                .build();
    }

    private ItemCategoryDto.Response toResponse(ItemCategory c) {
        return ItemCategoryDto.Response.builder()
                .id(c.getId())
                .brandId(c.getBrandId())
                .parentId(c.getParentId())
                .level(c.getLevel())
                .name(c.getName())
                .code(c.getCode())
                .description(c.getDescription())
                .icon(c.getIcon())
                .displayOrder(c.getDisplayOrder())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
