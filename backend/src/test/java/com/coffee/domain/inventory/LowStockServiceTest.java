package com.coffee.domain.inventory;

import com.coffee.domain.inventory.dto.LowStockDto;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.inventory.service.LowStockService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LowStockServiceTest {

    @Autowired private LowStockService lowStockService;
    @Autowired private InventoryService inventoryService;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;

    private Long storeId;
    private Long itemId1;
    private Long itemId2;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());

        // item1: min_stock = 500, 현재 재고 300 → 저재고
        Item item1 = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("원두").baseUnit("g")
                .minStockQty(new BigDecimal("500")).build());
        // item2: min_stock = 200, 현재 재고 300 → 정상
        Item item2 = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("우유").baseUnit("ml")
                .minStockQty(new BigDecimal("200")).build());

        storeId = store.getId();
        itemId1 = item1.getId();
        itemId2 = item2.getId();

        inventoryService.recordStockChange(storeId, itemId1, new BigDecimal("300"),
                LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);
        inventoryService.recordStockChange(storeId, itemId2, new BigDecimal("300"),
                LedgerType.RECEIVE, "DELIVERY", 2L, null, 1L);
    }

    @Test
    @DisplayName("저재고 아이템만 반환 (임계치 이하)")
    void lowStockDetection() {
        List<LowStockDto.Response> lowItems = lowStockService.getLowStockItems(storeId);
        assertThat(lowItems).hasSize(1);
        assertThat(lowItems.get(0).getItemId()).isEqualTo(itemId1);
        assertThat(lowItems.get(0).getCurrentQty()).isEqualByComparingTo("300");
        assertThat(lowItems.get(0).getMinStockQty()).isEqualByComparingTo("500");
        assertThat(lowItems.get(0).getDeficit()).isEqualByComparingTo("200");
    }

    @Test
    @DisplayName("min_stock_qty 미설정 아이템은 제외")
    void itemsWithoutMinStockExcluded() {
        Item item3 = itemRepository.save(Item.builder()
                .brandId(1L).name("시럽").baseUnit("ml").build());
        inventoryService.recordStockChange(storeId, item3.getId(), new BigDecimal("10"),
                LedgerType.RECEIVE, "DELIVERY", 3L, null, 1L);

        List<LowStockDto.Response> lowItems = lowStockService.getLowStockItems(storeId);
        assertThat(lowItems.stream().noneMatch(i -> i.getItemId().equals(item3.getId()))).isTrue();
    }
}
