package com.coffee.domain.inventory;

import com.coffee.common.exception.BusinessException;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.service.FifoStockService;
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
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FifoStockServiceTest {

    @Autowired private FifoStockService fifoStockService;
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
        Item item = itemRepository.save(Item.builder().brandId(brand.getId()).name("우유").baseUnit("ml").build());
        storeId = store.getId();
        itemId = item.getId();
    }

    @Test
    @DisplayName("FIFO 차감: lot A(1/31) → lot B(2/28) 순서로 차감")
    void fifoDeductsOldestFirst() {
        // 입고: lot A (유통기한 1/31) 500ml
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("500"),
                LocalDate.of(2026, 1, 31), "LOT-A", "DELIVERY", 1L, null, 1L);
        // 입고: lot B (유통기한 2/28) 500ml
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("500"),
                LocalDate.of(2026, 2, 28), "LOT-B", "DELIVERY", 2L, null, 1L);

        // 300ml 차감 → lot A에서 먼저 차감
        List<StockLedger> ledgers = fifoStockService.deductFifo(storeId, itemId,
                new BigDecimal("300"), LedgerType.SELL, "POS_SALES", 1L, null, null);

        assertThat(ledgers).hasSize(1);
        assertThat(ledgers.get(0).getLotNo()).isEqualTo("LOT-A");
        assertThat(ledgers.get(0).getQtyBaseUnit()).isEqualByComparingTo("-300");

        // lot별 잔고 확인
        List<InventorySnapshot> lots = fifoStockService.getLotSnapshots(storeId, itemId);
        assertThat(lots).hasSize(2);
        assertThat(lots.get(0).getLotNo()).isEqualTo("LOT-A");
        assertThat(lots.get(0).getQtyBaseUnit()).isEqualByComparingTo("200");
        assertThat(lots.get(1).getLotNo()).isEqualTo("LOT-B");
        assertThat(lots.get(1).getQtyBaseUnit()).isEqualByComparingTo("500");
    }

    @Test
    @DisplayName("FIFO 차감: 여러 lot 걸쳐 차감")
    void fifoDeductsAcrossMultipleLots() {
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("200"),
                LocalDate.of(2026, 1, 15), "LOT-A", "DELIVERY", 1L, null, 1L);
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("300"),
                LocalDate.of(2026, 2, 10), "LOT-B", "DELIVERY", 2L, null, 1L);

        // 350ml 차감 → lot A 200 전부 + lot B 150
        List<StockLedger> ledgers = fifoStockService.deductFifo(storeId, itemId,
                new BigDecimal("350"), LedgerType.SELL, "POS_SALES", 1L, null, null);

        assertThat(ledgers).hasSize(2);
        assertThat(ledgers.get(0).getLotNo()).isEqualTo("LOT-A");
        assertThat(ledgers.get(0).getQtyBaseUnit()).isEqualByComparingTo("-200");
        assertThat(ledgers.get(1).getLotNo()).isEqualTo("LOT-B");
        assertThat(ledgers.get(1).getQtyBaseUnit()).isEqualByComparingTo("-150");

        List<InventorySnapshot> lots = fifoStockService.getLotSnapshots(storeId, itemId);
        // LOT-A는 0이 되었지만 레코드는 남아있음
        InventorySnapshot lotA = lots.stream().filter(l -> "LOT-A".equals(l.getLotNo())).findFirst().orElseThrow();
        InventorySnapshot lotB = lots.stream().filter(l -> "LOT-B".equals(l.getLotNo())).findFirst().orElseThrow();
        assertThat(lotA.getQtyBaseUnit()).isEqualByComparingTo("0");
        assertThat(lotB.getQtyBaseUnit()).isEqualByComparingTo("150");
    }

    @Test
    @DisplayName("FIFO 차감: 재고 부족 시 예외")
    void fifoDeductInsufficientStockThrows() {
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("100"),
                LocalDate.of(2026, 3, 1), "LOT-A", "DELIVERY", 1L, null, 1L);

        assertThatThrownBy(() ->
                fifoStockService.deductFifo(storeId, itemId,
                        new BigDecimal("200"), LedgerType.SELL, "POS_SALES", 1L, null, null)
        ).isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("lot별 재고 조회 API 정상 동작")
    void getLotSnapshots() {
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("500"),
                LocalDate.of(2026, 1, 31), "LOT-A", "DELIVERY", 1L, null, 1L);
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("300"),
                LocalDate.of(2026, 2, 28), "LOT-B", "DELIVERY", 2L, null, 1L);

        List<InventorySnapshot> lots = fifoStockService.getLotSnapshots(storeId, itemId);
        assertThat(lots).hasSize(2);
        assertThat(lots.get(0).getExpDate()).isBefore(lots.get(1).getExpDate());
    }
}
