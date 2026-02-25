package com.coffee.domain.physicalcount;

import com.coffee.common.exception.BusinessException;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.physicalcount.dto.PhysicalCountDto;
import com.coffee.domain.physicalcount.dto.PhysicalCountLineDto;
import com.coffee.domain.physicalcount.service.PhysicalCountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PhysicalCountFlowTest {

    @Autowired private PhysicalCountService physicalCountService;
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
        Item item1 = itemRepository.save(Item.builder().brandId(brand.getId()).name("원두").baseUnit("g").build());
        Item item2 = itemRepository.save(Item.builder().brandId(brand.getId()).name("우유").baseUnit("ml").build());
        storeId = store.getId();
        itemId1 = item1.getId();
        itemId2 = item2.getId();

        // 재고 세팅
        inventoryService.recordStockChange(storeId, itemId1, new BigDecimal("1000"),
                LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);
        inventoryService.recordStockChange(storeId, itemId2, new BigDecimal("500"),
                LedgerType.RECEIVE, "DELIVERY", 2L, null, 1L);
    }

    @Test
    @DisplayName("실사 전체 흐름: 시작 → 수량 입력 → 완료 → 재고 조정")
    void fullPhysicalCountFlow() {
        // 1. 실사 시작
        PhysicalCountDto.Response started = physicalCountService.startCount(
                new PhysicalCountDto.StartRequest(storeId, 1L));
        assertThat(started.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(started.getLines()).hasSize(2);

        Long countId = started.getId();

        // 라인 찾기
        PhysicalCountLineDto.Response line1 = started.getLines().stream()
                .filter(l -> l.getItemId().equals(itemId1))
                .findFirst().orElseThrow();
        PhysicalCountLineDto.Response line2 = started.getLines().stream()
                .filter(l -> l.getItemId().equals(itemId2))
                .findFirst().orElseThrow();

        assertThat(line1.getSystemQty()).isEqualByComparingTo("1000");
        assertThat(line2.getSystemQty()).isEqualByComparingTo("500");

        // 2. 실제 수량 입력 (원두: 950g → gap -50, 우유: 520ml → gap +20)
        PhysicalCountLineDto.Response updated1 = physicalCountService.updateLine(
                countId, line1.getId(), new PhysicalCountLineDto.UpdateRequest(new BigDecimal("950"), "some spilled"));
        assertThat(updated1.getGapQty()).isEqualByComparingTo("-50");

        PhysicalCountLineDto.Response updated2 = physicalCountService.updateLine(
                countId, line2.getId(), new PhysicalCountLineDto.UpdateRequest(new BigDecimal("520"), null));
        assertThat(updated2.getGapQty()).isEqualByComparingTo("20");

        // 3. 완료
        PhysicalCountDto.Response completed = physicalCountService.completeCount(countId);
        assertThat(completed.getStatus()).isEqualTo("COMPLETED");
        assertThat(completed.getCompletedAt()).isNotNull();

        // 4. 재고 확인 - ADJUST가 반영되어야 함
        var snapshots = inventoryService.getSnapshot(storeId);
        BigDecimal item1Qty = snapshots.stream()
                .filter(s -> s.getItemId().equals(itemId1))
                .map(s -> s.getQtyBaseUnit())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal item2Qty = snapshots.stream()
                .filter(s -> s.getItemId().equals(itemId2))
                .map(s -> s.getQtyBaseUnit())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(item1Qty).isEqualByComparingTo("950");
        assertThat(item2Qty).isEqualByComparingTo("520");
    }

    @Test
    @DisplayName("실사 완료 전 미입력 라인이 있으면 예외")
    void completeWithoutAllCountedThrows() {
        PhysicalCountDto.Response started = physicalCountService.startCount(
                new PhysicalCountDto.StartRequest(storeId, 1L));

        assertThatThrownBy(() -> physicalCountService.completeCount(started.getId()))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("실사 이력 조회")
    void getHistory() {
        physicalCountService.startCount(new PhysicalCountDto.StartRequest(storeId, 1L));
        physicalCountService.startCount(new PhysicalCountDto.StartRequest(storeId, 1L));

        var history = physicalCountService.getHistory(storeId);
        assertThat(history).hasSize(2);
    }
}
