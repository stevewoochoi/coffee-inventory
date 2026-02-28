package com.coffee.domain.master.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.dto.PackagingDto;
import com.coffee.domain.master.entity.*;
import com.coffee.domain.master.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PackagingService {

    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final SupplierRepository supplierRepository;
    private final ItemCategoryRepository itemCategoryRepository;

    public List<PackagingDto.Response> findByItemId(Long itemId) {
        return packagingRepository.findByItemIdAndStatus(itemId, PackagingStatus.ACTIVE).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PackagingDto.Response> findAllByBrandId(Long brandId, PackagingStatus status) {
        List<Packaging> packagings;
        if (status != null) {
            packagings = packagingRepository.findAllByBrandIdAndStatus(brandId, status);
        } else {
            packagings = packagingRepository.findAllByBrandId(brandId);
        }

        if (packagings.isEmpty()) {
            return List.of();
        }

        // 일괄 조회로 N+1 방지
        List<Long> itemIds = packagings.stream().map(Packaging::getItemId).distinct().toList();
        List<Long> packagingIds = packagings.stream().map(Packaging::getId).toList();

        Map<Long, Item> itemMap = itemRepository.findAllById(itemIds).stream()
                .collect(Collectors.toMap(Item::getId, Function.identity()));

        Map<Long, List<SupplierItem>> siMap = supplierItemRepository.findByPackagingIdIn(packagingIds).stream()
                .collect(Collectors.groupingBy(SupplierItem::getPackagingId));

        Set<Long> supplierIds = siMap.values().stream()
                .flatMap(List::stream)
                .map(SupplierItem::getSupplierId)
                .collect(Collectors.toSet());
        Map<Long, Supplier> supplierMap = supplierIds.isEmpty()
                ? Map.of()
                : supplierRepository.findAllById(supplierIds).stream()
                        .collect(Collectors.toMap(Supplier::getId, Function.identity()));

        Set<Long> categoryIds = itemMap.values().stream()
                .map(Item::getCategoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, ItemCategory> catMap = categoryIds.isEmpty()
                ? Map.of()
                : itemCategoryRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(ItemCategory::getId, Function.identity()));

        return packagings.stream()
                .map(p -> toDetailedResponse(p, itemMap, siMap, supplierMap, catMap))
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
    public PackagingDto.Response update(Long id, PackagingDto.Request request) {
        Packaging packaging = getActiveOrThrow(id);
        packaging.setPackName(request.getPackName());
        packaging.setUnitsPerPack(request.getUnitsPerPack());
        packaging.setPackBarcode(request.getPackBarcode());
        if (request.getItemId() != null) {
            itemRepository.findByIdAndIsActiveTrue(request.getItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item", request.getItemId()));
            packaging.setItemId(request.getItemId());
        }
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

    private PackagingDto.Response toDetailedResponse(
            Packaging p,
            Map<Long, Item> itemMap,
            Map<Long, List<SupplierItem>> siMap,
            Map<Long, Supplier> supplierMap,
            Map<Long, ItemCategory> catMap) {

        Item item = itemMap.get(p.getItemId());
        String categoryName = null;
        Long categoryId = null;
        if (item != null && item.getCategoryId() != null) {
            ItemCategory cat = catMap.get(item.getCategoryId());
            if (cat != null) {
                categoryName = cat.getName();
            }
            categoryId = item.getCategoryId();
        }

        List<SupplierItem> sis = siMap.getOrDefault(p.getId(), List.of());
        List<PackagingDto.SupplierItemInfo> supplierItems = sis.stream()
                .map(si -> {
                    Supplier supplier = supplierMap.get(si.getSupplierId());
                    return PackagingDto.SupplierItemInfo.builder()
                            .supplierItemId(si.getId())
                            .supplierId(si.getSupplierId())
                            .supplierName(supplier != null ? supplier.getName() : null)
                            .price(si.getPrice())
                            .supplierSku(si.getSupplierSku())
                            .leadTimeDays(si.getLeadTimeDays())
                            .build();
                })
                .toList();

        return PackagingDto.Response.builder()
                .id(p.getId())
                .itemId(p.getItemId())
                .packName(p.getPackName())
                .unitsPerPack(p.getUnitsPerPack())
                .packBarcode(p.getPackBarcode())
                .imageUrl(p.getImageUrl())
                .status(p.getStatus().name())
                .createdAt(p.getCreatedAt())
                .itemName(item != null ? item.getName() : null)
                .baseUnit(item != null ? item.getBaseUnit() : null)
                .categoryName(categoryName)
                .categoryId(categoryId)
                .supplierItems(supplierItems)
                .build();
    }
}
