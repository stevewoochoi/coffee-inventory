package com.coffee.domain.master.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.dto.BrandItemDto;
import com.coffee.domain.master.entity.BrandItem;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.ItemCategory;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.BrandItemRepository;
import com.coffee.domain.master.repository.ItemCategoryRepository;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrandItemService {

    private final BrandItemRepository brandItemRepository;
    private final ItemRepository itemRepository;
    private final BrandRepository brandRepository;
    private final ItemCategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;

    public List<BrandItemDto.Response> findByBrand(Long brandId) {
        List<BrandItem> brandItems = brandItemRepository.findByBrandIdAndIsActiveTrue(brandId);
        return brandItems.stream().map(this::toResponse).toList();
    }

    public List<BrandItemDto.Response> findByItem(Long itemId) {
        List<BrandItem> brandItems = brandItemRepository.findByItemIdAndIsActiveTrue(itemId);
        return brandItems.stream().map(this::toResponse).toList();
    }

    @Transactional
    public BrandItemDto.Response assign(BrandItemDto.AssignRequest request) {
        brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", request.getBrandId()));
        itemRepository.findByIdAndIsActiveTrue(request.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item", request.getItemId()));

        // Check if already assigned (possibly deactivated)
        var existing = brandItemRepository.findByBrandIdAndItemId(request.getBrandId(), request.getItemId());
        if (existing.isPresent()) {
            BrandItem bi = existing.get();
            bi.setIsActive(true);
            if (request.getPrice() != null) bi.setPrice(request.getPrice());
            if (request.getVatInclusive() != null) bi.setVatInclusive(request.getVatInclusive());
            if (request.getSupplierId() != null) bi.setSupplierId(request.getSupplierId());
            if (request.getMinStockQty() != null) bi.setMinStockQty(request.getMinStockQty());
            if (request.getIsOrderable() != null) bi.setIsOrderable(request.getIsOrderable());
            if (request.getDisplayOrder() != null) bi.setDisplayOrder(request.getDisplayOrder());
            return toResponse(brandItemRepository.save(bi));
        }

        BrandItem brandItem = BrandItem.builder()
                .brandId(request.getBrandId())
                .itemId(request.getItemId())
                .price(request.getPrice())
                .vatInclusive(request.getVatInclusive() != null ? request.getVatInclusive() : true)
                .supplierId(request.getSupplierId())
                .minStockQty(request.getMinStockQty())
                .isOrderable(request.getIsOrderable() != null ? request.getIsOrderable() : true)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();
        return toResponse(brandItemRepository.save(brandItem));
    }

    @Transactional
    public BrandItemDto.Response update(Long id, BrandItemDto.UpdateRequest request) {
        BrandItem bi = brandItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BrandItem", id));
        if (request.getPrice() != null) bi.setPrice(request.getPrice());
        if (request.getVatInclusive() != null) bi.setVatInclusive(request.getVatInclusive());
        if (request.getSupplierId() != null) bi.setSupplierId(request.getSupplierId());
        if (request.getMinStockQty() != null) bi.setMinStockQty(request.getMinStockQty());
        if (request.getIsOrderable() != null) bi.setIsOrderable(request.getIsOrderable());
        if (request.getDisplayOrder() != null) bi.setDisplayOrder(request.getDisplayOrder());
        return toResponse(brandItemRepository.save(bi));
    }

    @Transactional
    public void unassign(Long id) {
        BrandItem bi = brandItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BrandItem", id));
        bi.setIsActive(false);
        brandItemRepository.save(bi);
    }

    private BrandItemDto.Response toResponse(BrandItem bi) {
        Item item = itemRepository.findById(bi.getItemId()).orElse(null);
        Brand brand = brandRepository.findById(bi.getBrandId()).orElse(null);

        String categoryName = null;
        if (item != null && item.getCategoryId() != null) {
            categoryName = categoryRepository.findById(item.getCategoryId())
                    .map(ItemCategory::getName).orElse(null);
        }
        String supplierName = null;
        if (bi.getSupplierId() != null) {
            supplierName = supplierRepository.findById(bi.getSupplierId())
                    .map(Supplier::getName).orElse(null);
        }

        return BrandItemDto.Response.builder()
                .id(bi.getId())
                .brandId(bi.getBrandId())
                .brandName(brand != null ? brand.getName() : null)
                .itemId(bi.getItemId())
                .itemName(item != null ? item.getName() : null)
                .itemCode(item != null ? item.getItemCode() : null)
                .baseUnit(item != null ? item.getBaseUnit() : null)
                .category(item != null ? item.getCategory() : null)
                .categoryId(item != null ? item.getCategoryId() : null)
                .categoryName(categoryName)
                .imageUrl(item != null ? item.getImageUrl() : null)
                .temperatureZone(item != null ? item.getTemperatureZone() : null)
                .price(bi.getPrice())
                .vatInclusive(bi.getVatInclusive())
                .supplierId(bi.getSupplierId())
                .supplierName(supplierName)
                .minStockQty(bi.getMinStockQty())
                .isOrderable(bi.getIsOrderable())
                .displayOrder(bi.getDisplayOrder())
                .isActive(bi.getIsActive())
                .createdAt(bi.getCreatedAt())
                .build();
    }
}
