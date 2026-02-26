package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.dto.OrderNeedsDto;
import com.coffee.domain.ordering.service.OrderNeedsService;
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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OrderNeedsServiceTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private OrderNeedsService orderNeedsService;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierItemRepository supplierItemRepository;
    @Autowired private InventoryService inventoryService;

    private String token;
    private Long storeId;
    private Long brandId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brand.getId()).name("Bean Supplier").email("s@t.com").build());

        // URGENT item: stock=500, minStock=1000 (stock <= minStock)
        Item urgentItem = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Urgent Coffee").baseUnit("g")
                .minStockQty(new BigDecimal("1000")).build());
        Packaging urgentPkg = packagingRepository.save(Packaging.builder()
                .itemId(urgentItem.getId()).packName("1kg").unitsPerPack(new BigDecimal("1000")).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier.getId()).packagingId(urgentPkg.getId())
                .leadTimeDays(2).price(new BigDecimal("10000")).build());
        inventoryService.recordStockChange(storeId, urgentItem.getId(),
                new BigDecimal("500"), LedgerType.RECEIVE, null, null, null, null);

        // RECOMMENDED item: stock=1200, minStock=1000 (stock <= minStock*1.5)
        Item recItem = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Rec Sugar").baseUnit("g")
                .minStockQty(new BigDecimal("1000")).build());
        Packaging recPkg = packagingRepository.save(Packaging.builder()
                .itemId(recItem.getId()).packName("1kg").unitsPerPack(new BigDecimal("1000")).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier.getId()).packagingId(recPkg.getId())
                .leadTimeDays(1).price(new BigDecimal("5000")).build());
        inventoryService.recordStockChange(storeId, recItem.getId(),
                new BigDecimal("1200"), LedgerType.RECEIVE, null, null, null, null);

        // PREDICTED item: after sells, stock=500, minStock=100, high daily usage → daysUntilEmpty=2.5
        Item predItem = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Pred Milk").baseUnit("ml")
                .minStockQty(new BigDecimal("100")).build());
        Packaging predPkg = packagingRepository.save(Packaging.builder()
                .itemId(predItem.getId()).packName("1L").unitsPerPack(new BigDecimal("1000")).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier.getId()).packagingId(predPkg.getId())
                .leadTimeDays(1).price(new BigDecimal("3000")).build());
        // Need currentStock=500 after sells, with 200/day usage over 14 days
        // Initial: 500 + (14 * 200) = 3300
        inventoryService.recordStockChange(storeId, predItem.getId(),
                new BigDecimal("3300"), LedgerType.RECEIVE, null, null, null, null);
        for (int i = 0; i < 14; i++) {
            inventoryService.recordStockChange(storeId, predItem.getId(),
                    new BigDecimal("-200"), LedgerType.SELL, "POS", null, null, null);
        }
        // After: snapshot=3300-2800=500, avgDailyUsage=200, daysUntilEmpty=500/200=2.5 (<=3)
        // 500 > 100*1.5=150 so not urgent/recommended, but daysUntilEmpty<=3 so predicted

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("3단계 분류 정확도 테스트")
    void classifiesItemsIntoThreeGroups() {
        OrderNeedsDto.Response result = orderNeedsService.getOrderNeeds(storeId, brandId);

        assertThat(result.getStoreId()).isEqualTo(storeId);
        assertThat(result.getUrgent()).hasSize(1);
        assertThat(result.getUrgent().get(0).getItemName()).isEqualTo("Urgent Coffee");
        assertThat(result.getRecommended()).hasSize(1);
        assertThat(result.getRecommended().get(0).getItemName()).isEqualTo("Rec Sugar");
        assertThat(result.getPredicted()).hasSize(1);
        assertThat(result.getPredicted().get(0).getItemName()).isEqualTo("Pred Milk");
    }

    @Test
    @DisplayName("추천수량 계산 테스트")
    void calculatesSuggestedQuantity() {
        OrderNeedsDto.Response result = orderNeedsService.getOrderNeeds(storeId, brandId);

        // Urgent Coffee: minStock=1000, currentStock=500 → suggestedBaseUnit = 1000*2 - 500 = 1500
        OrderNeedsDto.NeedsItem urgentItem = result.getUrgent().get(0);
        assertThat(urgentItem.getSuggestedQty()).isEqualTo(1500);
        // PackQty: 1500/1000 = 2 packs
        assertThat(urgentItem.getSuppliers().get(0).getPackagings().get(0).getSuggestedPackQty()).isEqualTo(2);
    }

    @Test
    @DisplayName("API 엔드포인트 테스트")
    void orderNeedsEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/needs")
                        .param("storeId", storeId.toString())
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.urgent").isArray())
                .andExpect(jsonPath("$.data.recommended").isArray())
                .andExpect(jsonPath("$.data.predicted").isArray());
    }
}
