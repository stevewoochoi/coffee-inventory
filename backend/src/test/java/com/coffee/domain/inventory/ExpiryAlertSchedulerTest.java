package com.coffee.domain.inventory;

import com.coffee.domain.inventory.entity.AlertStatus;
import com.coffee.domain.inventory.entity.ItemExpiryAlert;
import com.coffee.domain.inventory.repository.ItemExpiryAlertRepository;
import com.coffee.domain.inventory.service.ExpiryAlertScheduler;
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

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ExpiryAlertSchedulerTest {

    @Autowired private ExpiryAlertScheduler scheduler;
    @Autowired private FifoStockService fifoStockService;
    @Autowired private ItemExpiryAlertRepository alertRepository;
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
    @DisplayName("D-7 이하: WARNING")
    void warningAlert() {
        LocalDate expDate = LocalDate.now().plusDays(5);
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("500"),
                expDate, "LOT-W", "DELIVERY", 1L, null, 1L);

        scheduler.refreshAlerts(storeId);

        List<ItemExpiryAlert> alerts = alertRepository.findByStoreId(storeId);
        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getAlertStatus()).isEqualTo(AlertStatus.WARNING);
    }

    @Test
    @DisplayName("D-3 이하: CRITICAL")
    void criticalAlert() {
        LocalDate expDate = LocalDate.now().plusDays(2);
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("500"),
                expDate, "LOT-C", "DELIVERY", 1L, null, 1L);

        scheduler.refreshAlerts(storeId);

        List<ItemExpiryAlert> alerts = alertRepository.findByStoreId(storeId);
        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getAlertStatus()).isEqualTo(AlertStatus.CRITICAL);
    }

    @Test
    @DisplayName("D-0 이하: EXPIRED")
    void expiredAlert() {
        LocalDate expDate = LocalDate.now().minusDays(1);
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("500"),
                expDate, "LOT-E", "DELIVERY", 1L, null, 1L);

        scheduler.refreshAlerts(storeId);

        List<ItemExpiryAlert> alerts = alertRepository.findByStoreId(storeId);
        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getAlertStatus()).isEqualTo(AlertStatus.EXPIRED);
    }

    @Test
    @DisplayName("D-8 이상: NORMAL")
    void normalAlert() {
        LocalDate expDate = LocalDate.now().plusDays(10);
        fifoStockService.receiveStock(storeId, itemId, new BigDecimal("500"),
                expDate, "LOT-N", "DELIVERY", 1L, null, 1L);

        scheduler.refreshAlerts(storeId);

        List<ItemExpiryAlert> alerts = alertRepository.findByStoreId(storeId);
        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getAlertStatus()).isEqualTo(AlertStatus.NORMAL);
    }

    @Test
    @DisplayName("determineAlertStatus 정적 메서드 검증")
    void determineAlertStatusTest() {
        assertThat(ExpiryAlertScheduler.determineAlertStatus(10)).isEqualTo(AlertStatus.NORMAL);
        assertThat(ExpiryAlertScheduler.determineAlertStatus(8)).isEqualTo(AlertStatus.NORMAL);
        assertThat(ExpiryAlertScheduler.determineAlertStatus(7)).isEqualTo(AlertStatus.WARNING);
        assertThat(ExpiryAlertScheduler.determineAlertStatus(4)).isEqualTo(AlertStatus.WARNING);
        assertThat(ExpiryAlertScheduler.determineAlertStatus(3)).isEqualTo(AlertStatus.CRITICAL);
        assertThat(ExpiryAlertScheduler.determineAlertStatus(1)).isEqualTo(AlertStatus.CRITICAL);
        assertThat(ExpiryAlertScheduler.determineAlertStatus(0)).isEqualTo(AlertStatus.EXPIRED);
        assertThat(ExpiryAlertScheduler.determineAlertStatus(-1)).isEqualTo(AlertStatus.EXPIRED);
    }
}
