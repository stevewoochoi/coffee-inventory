package com.coffee.domain.ordering.service;

import com.coffee.domain.master.entity.*;
import com.coffee.domain.master.repository.*;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.master.repository.ItemDeliveryScheduleRepository;
import com.coffee.domain.master.repository.BrandItemRepository;
import com.coffee.domain.ordering.dto.CatalogDto;
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderCatalogService {

    private final ItemRepository itemRepository;
    private final BrandItemRepository brandItemRepository;
    private final ItemCategoryRepository categoryRepository;
    private final PackagingRepository packagingRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final SupplierRepository supplierRepository;
    private final OrderPlanRepository orderPlanRepository;
    private final OrderLineRepository orderLineRepository;
    private final DeliveryPolicyService policyService;
    private final StoreRepository storeRepository;
    private final OrderRecommendationService recommendationService;
    private final ItemDeliveryScheduleRepository scheduleRepository;

    public Page<CatalogDto.CatalogItem> getCatalog(Long storeId, LocalDate deliveryDate,
                                                     Long categoryId, String keyword,
                                                     boolean lowStockOnly, Pageable pageable) {
        // Get brand from store policy, fallback to store's own brandId
        var policy = policyService.getStorePolicy(storeId);
        Long brandId = policy != null ? policy.getBrandId() : null;
        if (brandId == null) {
            brandId = storeRepository.findById(storeId)
                    .map(s -> s.getBrandId()).orElse(null);
        }
        if (brandId == null) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        // Get all active items for this brand via brand_item junction
        List<Item> allItems = new ArrayList<>();
        Map<Long, BrandItem> brandItemMap = new HashMap<>();
        List<BrandItem> brandItems = brandItemRepository.findByBrandIdAndIsActiveTrue(brandId);
        for (BrandItem bi : brandItems) {
            itemRepository.findByIdAndIsActiveTrue(bi.getItemId()).ifPresent(item -> {
                allItems.add(item);
                brandItemMap.put(item.getId(), bi);
            });
        }
        if (allItems.isEmpty()) {
            // Fallback: use brand_id on item table (same brand only)
            allItems.addAll(itemRepository.findByBrandIdAndIsActiveTrue(brandId));
        }

        // Pre-load maps for performance
        Map<Long, BigDecimal> stockMap = recommendationService.getCurrentStockMap(storeId);
        Map<Long, BigDecimal> usageMap = recommendationService.getDailyUsageMap(storeId);

        // Filter items — 모든 상품 반환, orderable 플래그로 구분
        final LocalDate finalDeliveryDate = deliveryDate;
        List<CatalogDto.CatalogItem> catalogItems = allItems.stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsOrderable()))
                .filter(item -> categoryId == null || categoryId.equals(item.getCategoryId()))
                .filter(item -> keyword == null || keyword.isEmpty()
                        || item.getName().toLowerCase().contains(keyword.toLowerCase()))
                .map(item -> {
                    BrandItem bi = brandItemMap.get(item.getId());
                    CatalogDto.CatalogItem ci = buildCatalogItem(item, bi, storeId, stockMap, usageMap);
                    if (finalDeliveryDate != null) {
                        boolean orderable = policyService.isItemOrderableForDate(item.getId(), finalDeliveryDate, storeId);
                        return CatalogDto.CatalogItem.builder()
                                .itemId(ci.getItemId()).itemName(ci.getItemName())
                                .itemCode(ci.getItemCode()).spec(ci.getSpec())
                                .categoryId(ci.getCategoryId()).categoryName(ci.getCategoryName())
                                .imageUrl(ci.getImageUrl()).temperatureZone(ci.getTemperatureZone())
                                .currentStock(ci.getCurrentStock()).unit(ci.getUnit())
                                .minStock(ci.getMinStock()).isLowStock(ci.isLowStock())
                                .deliveryDays(ci.getDeliveryDays())
                                .packagings(ci.getPackagings()).lastOrder(ci.getLastOrder())
                                .suggestedQty(ci.getSuggestedQty()).suggestedByAi(ci.isSuggestedByAi())
                                .daysUntilEmpty(ci.getDaysUntilEmpty())
                                .orderable(orderable)
                                .currency(ci.getCurrency())
                                .build();
                    }
                    return CatalogDto.CatalogItem.builder()
                            .itemId(ci.getItemId()).itemName(ci.getItemName())
                            .itemCode(ci.getItemCode()).spec(ci.getSpec())
                            .categoryId(ci.getCategoryId()).categoryName(ci.getCategoryName())
                            .imageUrl(ci.getImageUrl()).temperatureZone(ci.getTemperatureZone())
                            .currentStock(ci.getCurrentStock()).unit(ci.getUnit())
                            .minStock(ci.getMinStock()).isLowStock(ci.isLowStock())
                            .deliveryDays(ci.getDeliveryDays())
                            .packagings(ci.getPackagings()).lastOrder(ci.getLastOrder())
                            .suggestedQty(ci.getSuggestedQty()).suggestedByAi(ci.isSuggestedByAi())
                            .daysUntilEmpty(ci.getDaysUntilEmpty())
                            .orderable(true)
                            .currency(ci.getCurrency())
                            .build();
                })
                .filter(ci -> !lowStockOnly || ci.isLowStock())
                .sorted(Comparator.comparing(CatalogDto.CatalogItem::isOrderable).reversed()
                        .thenComparing(CatalogDto.CatalogItem::isLowStock).reversed()
                        .thenComparing(CatalogDto.CatalogItem::getItemName))
                .toList();

        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), catalogItems.size());
        List<CatalogDto.CatalogItem> pageContent = start < catalogItems.size()
                ? catalogItems.subList(start, end)
                : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, catalogItems.size());
    }

    public List<CatalogDto.CategoryTree> getCategoryTree(Long brandId) {
        List<ItemCategory> categories = categoryRepository.findByBrandIdAndIsActiveTrue(brandId);

        // Build tree from flat list
        Map<Long, List<ItemCategory>> childrenMap = categories.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(ItemCategory::getParentId));

        return categories.stream()
                .filter(c -> c.getParentId() == null)
                .sorted(Comparator.comparingInt(c -> c.getDisplayOrder() != null ? c.getDisplayOrder() : 0))
                .map(c -> buildCategoryNode(c, childrenMap))
                .toList();
    }

    private CatalogDto.CatalogItem buildCatalogItem(Item item, BrandItem brandItem, Long storeId,
                                                      Map<Long, BigDecimal> stockMap,
                                                      Map<Long, BigDecimal> usageMap) {
        BigDecimal currentStock = stockMap.getOrDefault(item.getId(), BigDecimal.ZERO);
        // Use brand-specific minStockQty if available, fallback to item-level
        BigDecimal minStock = brandItem != null && brandItem.getMinStockQty() != null
                ? brandItem.getMinStockQty()
                : (item.getMinStockQty() != null ? item.getMinStockQty() : BigDecimal.ZERO);
        boolean isLowStock = currentStock.compareTo(minStock) < 0;

        // Get category name
        String categoryName = null;
        if (item.getCategoryId() != null) {
            categoryName = categoryRepository.findById(item.getCategoryId())
                    .map(ItemCategory::getName)
                    .orElse(null);
        }

        // Build packaging options
        List<Packaging> packagings = packagingRepository.findByItemId(item.getId());
        List<CatalogDto.PackagingOption> packagingOptions = packagings.stream()
                .filter(p -> p.getStatus() == PackagingStatus.ACTIVE)
                .map(pkg -> {
                    // Find supplier for this packaging
                    List<SupplierItem> supplierItems = supplierItemRepository.findByPackagingId(pkg.getId());
                    if (supplierItems.isEmpty()) {
                        return null;
                    }
                    SupplierItem si = supplierItems.get(0);
                    Supplier supplier = supplierRepository.findById(si.getSupplierId()).orElse(null);

                    return CatalogDto.PackagingOption.builder()
                            .packagingId(pkg.getId())
                            .label(pkg.getPackName())
                            .orderUnitName(pkg.getOrderUnitName())
                            .unitsPerPack(pkg.getUnitsPerPack())
                            .unitPrice(si.getPrice() != null ? si.getPrice() : BigDecimal.ZERO)
                            .supplierId(si.getSupplierId())
                            .supplierName(supplier != null ? supplier.getName() : "Unknown")
                            .maxOrderQty(item.getMaxOrderQty())
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();

        // Calculate suggested quantity (use first packaging option)
        int suggestedQty = 0;
        if (!packagingOptions.isEmpty() && !packagings.isEmpty()) {
            Packaging firstPkg = packagings.stream()
                    .filter(p -> p.getStatus() == PackagingStatus.ACTIVE)
                    .findFirst()
                    .orElse(null);
            if (firstPkg != null) {
                int leadTime = item.getLeadTimeDays() != null ? item.getLeadTimeDays() : 2;
                suggestedQty = recommendationService.calculateRecommendedQty(
                        storeId, item, firstPkg, leadTime);
            }
        }

        // Days until empty
        BigDecimal dailyUsage = usageMap.getOrDefault(item.getId(), BigDecimal.ZERO);
        Double daysUntilEmpty = null;
        if (dailyUsage.compareTo(BigDecimal.ZERO) > 0 && currentStock.compareTo(BigDecimal.ZERO) > 0) {
            daysUntilEmpty = currentStock.divide(dailyUsage, 1, RoundingMode.HALF_UP).doubleValue();
        }

        // Last order info
        CatalogDto.LastOrderInfo lastOrder = getLastOrderInfo(storeId, item.getId());

        // Get delivery schedule display
        String deliveryDays = null;
        if (item.getBrandId() != null) {
            deliveryDays = scheduleRepository.findByItemIdAndBrandId(item.getId(), item.getBrandId())
                    .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                    .map(ItemDeliverySchedule::getDisplayDays)
                    .orElse(null);
        }

        return CatalogDto.CatalogItem.builder()
                .itemId(item.getId())
                .itemName(item.getName())
                .itemCode(item.getItemCode())
                .spec(item.getSpec())
                .deliveryDays(deliveryDays)
                .categoryId(item.getCategoryId())
                .categoryName(categoryName)
                .imageUrl(item.getImageUrl())
                .temperatureZone(item.getTemperatureZone())
                .currentStock(currentStock)
                .unit(item.getBaseUnit())
                .minStock(minStock)
                .isLowStock(isLowStock)
                .packagings(packagingOptions)
                .lastOrder(lastOrder)
                .suggestedQty(suggestedQty)
                .suggestedByAi(false)
                .daysUntilEmpty(daysUntilEmpty)
                .currency(item.getCurrency() != null ? item.getCurrency() : "JPY")
                .build();
    }

    private CatalogDto.LastOrderInfo getLastOrderInfo(Long storeId, Long itemId) {
        List<OrderPlan> plans = orderPlanRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        for (OrderPlan plan : plans) {
            List<OrderLine> lines = orderLineRepository.findByOrderPlanId(plan.getId());
            for (OrderLine line : lines) {
                Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
                if (pkg != null && pkg.getItemId().equals(itemId)) {
                    return CatalogDto.LastOrderInfo.builder()
                            .date(plan.getCreatedAt().toLocalDate())
                            .quantity(line.getPackQty())
                            .build();
                }
            }
        }
        return null;
    }

    private CatalogDto.CategoryTree buildCategoryNode(ItemCategory category,
                                                        Map<Long, List<ItemCategory>> childrenMap) {
        List<ItemCategory> children = childrenMap.getOrDefault(category.getId(), Collections.emptyList());

        return CatalogDto.CategoryTree.builder()
                .id(category.getId())
                .name(category.getName())
                .level(category.getLevel())
                .icon(category.getIcon())
                .children(children.stream()
                        .sorted(Comparator.comparingInt(c -> c.getDisplayOrder() != null ? c.getDisplayOrder() : 0))
                        .map(c -> buildCategoryNode(c, childrenMap))
                        .toList())
                .build();
    }
}
