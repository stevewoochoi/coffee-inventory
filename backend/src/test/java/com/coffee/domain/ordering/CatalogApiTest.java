package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.*;
import com.coffee.domain.master.repository.*;
import com.coffee.domain.ordering.entity.DeliveryPolicy;
import com.coffee.domain.ordering.entity.StoreDeliveryPolicy;
import com.coffee.domain.ordering.repository.DeliveryPolicyRepository;
import com.coffee.domain.ordering.repository.StoreDeliveryPolicyRepository;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CatalogApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemCategoryRepository categoryRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierItemRepository supplierItemRepository;
    @Autowired private DeliveryPolicyRepository policyRepository;
    @Autowired private StoreDeliveryPolicyRepository storePolicyRepository;
    @Autowired private InventoryService inventoryService;

    private String token;
    private Long storeId;
    private Long brandId;
    private Long categoryId1;
    private Long categoryId2;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("Store").build());
        storeId = store.getId();

        // Categories
        ItemCategory cat1 = categoryRepository.save(ItemCategory.builder()
                .brandId(brandId).name("Coffee").level(1).displayOrder(1).build());
        ItemCategory cat2 = categoryRepository.save(ItemCategory.builder()
                .brandId(brandId).name("Dairy").level(1).displayOrder(2).build());
        categoryId1 = cat1.getId();
        categoryId2 = cat2.getId();

        // Items with different categories
        Item coffee = itemRepository.save(Item.builder()
                .brandId(brandId).name("Coffee Bean").baseUnit("g")
                .categoryId(categoryId1).isOrderable(true)
                .minStockQty(new BigDecimal("500")).leadTimeDays(2).build());
        Item milk = itemRepository.save(Item.builder()
                .brandId(brandId).name("Fresh Milk").baseUnit("ml")
                .categoryId(categoryId2).isOrderable(true)
                .minStockQty(new BigDecimal("2000")).leadTimeDays(1).build());
        Item nonOrderable = itemRepository.save(Item.builder()
                .brandId(brandId).name("Napkin").baseUnit("ea")
                .isOrderable(false).build());

        // Packagings
        Packaging coffeePkg = packagingRepository.save(Packaging.builder()
                .itemId(coffee.getId()).packName("1kg Coffee")
                .unitsPerPack(new BigDecimal("1000")).build());
        Packaging milkPkg = packagingRepository.save(Packaging.builder()
                .itemId(milk.getId()).packName("1L Milk")
                .unitsPerPack(new BigDecimal("1000")).build());

        // Suppliers
        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brandId).name("Main Supplier").build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier.getId()).packagingId(coffeePkg.getId())
                .price(new BigDecimal("15000")).leadTimeDays(2).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier.getId()).packagingId(milkPkg.getId())
                .price(new BigDecimal("3000")).leadTimeDays(1).build());

        // Inventory - coffee is low stock, milk is ok
        inventoryService.recordStockChange(storeId, coffee.getId(),
                new BigDecimal("300"), LedgerType.RECEIVE, null, null, null, null);
        inventoryService.recordStockChange(storeId, milk.getId(),
                new BigDecimal("5000"), LedgerType.RECEIVE, null, null, null, null);

        // Delivery policy
        DeliveryPolicy policy = policyRepository.save(DeliveryPolicy.builder()
                .brandId(brandId).policyName("Default")
                .deliveryDays("MON_WED_FRI")
                .cutoffTime(LocalTime.of(9, 0))
                .cutoffLeadDaysBefore(2).cutoffLeadDaysAfter(3)
                .build());
        storePolicyRepository.save(StoreDeliveryPolicy.builder()
                .storeId(storeId).deliveryPolicyId(policy.getId()).isDefault(true).build());

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brandId, storeId);
    }

    @Test
    @DisplayName("카탈로그 조회 - 발주 가능 상품 반환")
    void getCatalog_returnsOrderableItems() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/catalog")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content.length()").value(greaterThanOrEqualTo(1)));
    }

    @Test
    @DisplayName("카탈로그 조회 - 카테고리별 필터링")
    void getCatalog_filterByCategory() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/catalog")
                        .param("storeId", storeId.toString())
                        .param("categoryId", categoryId1.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("카탈로그 조회 - 키워드 검색")
    void getCatalog_searchByKeyword() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/catalog")
                        .param("storeId", storeId.toString())
                        .param("keyword", "Coffee")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("카탈로그 조회 - 부족재고만 필터링")
    void getCatalog_lowStockOnly() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/catalog")
                        .param("storeId", storeId.toString())
                        .param("lowStockOnly", "true")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("카탈로그 조회 - 납품일 기반 필터링")
    void getCatalog_filterByDeliveryDate() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(7);
        while (futureDate.getDayOfWeek() != DayOfWeek.MONDAY
                && futureDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                && futureDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
            futureDate = futureDate.plusDays(1);
        }

        mockMvc.perform(get("/api/v1/ordering/catalog")
                        .param("storeId", storeId.toString())
                        .param("deliveryDate", futureDate.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("카테고리 트리 조회")
    void getCategories_returnsTree() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/categories")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(greaterThanOrEqualTo(2)));
    }
}
