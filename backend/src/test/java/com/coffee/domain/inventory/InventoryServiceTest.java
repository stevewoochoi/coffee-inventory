package com.coffee.domain.inventory;

import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.service.InventoryService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InventoryServiceTest {

    @Autowired private InventoryService inventoryService;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;

    private Long storeId;
    private Long itemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        Item item = itemRepository.save(Item.builder().brandId(brand.getId()).name("원두").baseUnit("g").build());
        storeId = store.getId();
        itemId = item.getId();
    }

    @Test
    @DisplayName("입고 기록 → Snapshot 자동 갱신")
    void receiveUpdatesSnapshot() {
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("1000"), LedgerType.RECEIVE, "DELIVERY", 1L, "test", 1L);

        List<InventorySnapshot> snapshots = inventoryService.getSnapshot(storeId);
        assertThat(snapshots).hasSize(1);
        assertThat(snapshots.get(0).getQtyBaseUnit()).isEqualByComparingTo("1000");
    }

    @Test
    @DisplayName("입고 + 판매 → Snapshot 정확한 잔고")
    void receiveAndSellBalance() {
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("1000"), LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("-300"), LedgerType.SELL, "POS_SALES", 1L, null, null);

        List<InventorySnapshot> snapshots = inventoryService.getSnapshot(storeId);
        assertThat(snapshots.get(0).getQtyBaseUnit()).isEqualByComparingTo("700");
    }

    @Test
    @DisplayName("여러 번 입고 → Snapshot 누적")
    void multipleReceives() {
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("500"), LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("300"), LedgerType.RECEIVE, "DELIVERY", 2L, null, 1L);

        List<InventorySnapshot> snapshots = inventoryService.getSnapshot(storeId);
        assertThat(snapshots.get(0).getQtyBaseUnit()).isEqualByComparingTo("800");
    }

    @Test
    @DisplayName("Ledger 이력 조회")
    void getLedgerHistory() {
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("1000"), LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("-200"), LedgerType.WASTE, "WASTE", 1L, "expired", 1L);

        Page<StockLedger> ledger = inventoryService.getLedger(storeId, itemId, PageRequest.of(0, 50));
        assertThat(ledger.getContent()).hasSize(2);
    }

    @Test
    @DisplayName("폐기 → Snapshot 차감")
    void wasteDeductsSnapshot() {
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("1000"), LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("-100"), LedgerType.WASTE, "WASTE", 1L, "dropped", 1L);

        List<InventorySnapshot> snapshots = inventoryService.getSnapshot(storeId);
        assertThat(snapshots.get(0).getQtyBaseUnit()).isEqualByComparingTo("900");
    }
}
