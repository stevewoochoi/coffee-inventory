package com.coffee.domain.master.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.dto.ItemDto;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.ItemCategory;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.ItemCategoryRepository;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.org.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import com.coffee.domain.master.dto.ItemOperationalRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemService {

    private final ItemRepository itemRepository;
    private final BrandRepository brandRepository;
    private final ItemCategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;

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
        if (request.getBrandId() == null) {
            throw new BusinessException("Brand ID is required", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", request.getBrandId()));

        Item item = Item.builder()
                .brandId(request.getBrandId())
                .name(request.getName())
                .nameEn(request.getNameEn())
                .nameJa(request.getNameJa())
                .nameKo(request.getNameKo())
                .category(request.getCategory())
                .categoryId(request.getCategoryId())
                .baseUnit(request.getBaseUnit())
                .lossRate(request.getLossRate() != null ? request.getLossRate() : java.math.BigDecimal.ZERO)
                .price(request.getPrice())
                .vatInclusive(request.getVatInclusive() != null ? request.getVatInclusive() : true)
                .supplierId(request.getSupplierId())
                .itemCode(request.getItemCode())
                .spec(request.getSpec())
                .description(request.getDescription())
                .build();
        return toResponse(itemRepository.save(item));
    }

    @Transactional
    public ItemDto.Response update(Long id, ItemDto.Request request) {
        Item item = getActiveItemOrThrow(id);
        item.setName(request.getName());
        item.setNameEn(request.getNameEn());
        item.setNameJa(request.getNameJa());
        item.setNameKo(request.getNameKo());
        item.setCategory(request.getCategory());
        item.setCategoryId(request.getCategoryId());
        item.setBaseUnit(request.getBaseUnit());
        if (request.getLossRate() != null) {
            item.setLossRate(request.getLossRate());
        }
        item.setPrice(request.getPrice());
        if (request.getVatInclusive() != null) {
            item.setVatInclusive(request.getVatInclusive());
        }
        item.setSupplierId(request.getSupplierId());
        item.setItemCode(request.getItemCode());
        item.setSpec(request.getSpec());
        item.setDescription(request.getDescription());
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

    @Transactional
    public ItemDto.Response updateItemOperational(Long id, ItemOperationalRequest request) {
        Item item = getActiveItemOrThrow(id);

        List<String> validCycles = List.of("DAILY", "TWICE_WEEKLY", "WEEKLY", "MONTHLY");
        if (request.getCountCycle() != null && !validCycles.contains(request.getCountCycle())) {
            throw new IllegalArgumentException("Invalid countCycle: " + request.getCountCycle());
        }

        if (request.getStockUnit() != null) item.setStockUnit(request.getStockUnit());
        if (request.getOrderUnit() != null) item.setOrderUnit(request.getOrderUnit());
        if (request.getConversionQty() != null) item.setConversionQty(java.math.BigDecimal.valueOf(request.getConversionQty()));
        if (request.getMinOrderQty() != null) item.setMinOrderQty(request.getMinOrderQty());
        if (request.getParLevel() != null) item.setParLevel(java.math.BigDecimal.valueOf(request.getParLevel()));
        if (request.getCountCycle() != null) item.setCountCycle(request.getCountCycle());
        if (request.getStorageZone() != null) item.setStorageZone(request.getStorageZone());
        if (request.getItemGrade() != null) item.setItemGrade(request.getItemGrade());
        item.setSubstituteItemId(request.getSubstituteItemId());
        if (request.getLotTracking() != null) item.setLotTracking(request.getLotTracking());
        if (request.getIsPosTracked() != null) item.setIsPosTracked(request.getIsPosTracked());

        return toResponse(itemRepository.save(item));
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
        String supplierName = null;
        if (item.getSupplierId() != null) {
            supplierName = supplierRepository.findById(item.getSupplierId())
                    .map(Supplier::getName).orElse(null);
        }
        return ItemDto.Response.builder()
                .id(item.getId())
                .brandId(item.getBrandId())
                .name(item.getName())
                .nameEn(item.getNameEn())
                .nameJa(item.getNameJa())
                .nameKo(item.getNameKo())
                .category(item.getCategory())
                .categoryId(item.getCategoryId())
                .categoryName(categoryName)
                .baseUnit(item.getBaseUnit())
                .lossRate(item.getLossRate())
                .price(item.getPrice())
                .vatInclusive(item.getVatInclusive())
                .supplierId(item.getSupplierId())
                .supplierName(supplierName)
                .minStockQty(item.getMinStockQty())
                .imageUrl(item.getImageUrl())
                .isActive(item.getIsActive())
                .itemCode(item.getItemCode())
                .spec(item.getSpec())
                .description(item.getDescription())
                .createdAt(item.getCreatedAt())
                .stockUnit(item.getStockUnit())
                .orderUnit(item.getOrderUnit())
                .conversionQty(item.getConversionQty() != null ? item.getConversionQty().doubleValue() : null)
                .minOrderQty(item.getMinOrderQty())
                .parLevel(item.getParLevel() != null ? item.getParLevel().doubleValue() : null)
                .countCycle(item.getCountCycle())
                .storageZone(item.getStorageZone())
                .itemGrade(item.getItemGrade())
                .substituteItemId(item.getSubstituteItemId())
                .lotTracking(item.getLotTracking())
                .dailyUsageAvg(item.getDailyUsageAvg() != null ? item.getDailyUsageAvg().doubleValue() : null)
                .isPosTracked(item.getIsPosTracked())
                .build();
    }
}
