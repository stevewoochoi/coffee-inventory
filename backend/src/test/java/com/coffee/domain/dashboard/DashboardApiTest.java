package com.coffee.domain.dashboard;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DashboardApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private OrderPlanRepository planRepository;
    @Autowired private InventoryService inventoryService;

    private String token;
    private Long storeId;
    private Long brandId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("Store").build());
        storeId = store.getId();

        // Create items with inventory
        Item coffee = itemRepository.save(Item.builder()
                .brandId(brandId).name("Coffee Bean").baseUnit("g")
                .minStockQty(new BigDecimal("500")).build());
        Item milk = itemRepository.save(Item.builder()
                .brandId(brandId).name("Milk").baseUnit("ml")
                .minStockQty(new BigDecimal("2000")).build());

        // Stock: coffee low (300 < 500 min), milk ok (3000 > 2000 min)
        inventoryService.recordStockChange(storeId, coffee.getId(),
                new BigDecimal("300"), LedgerType.RECEIVE, null, null, null, null);
        inventoryService.recordStockChange(storeId, milk.getId(),
                new BigDecimal("3000"), LedgerType.RECEIVE, null, null, null, null);

        // Sales for daily consumption
        for (int i = 0; i < 5; i++) {
            inventoryService.recordStockChange(storeId, coffee.getId(),
                    new BigDecimal("-50"), LedgerType.SELL, "POS_SALES", null, null, null);
        }

        // Create some orders
        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brandId).name("Supplier").build());
        planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplier.getId())
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("50000"))
                .vatAmount(new BigDecimal("5000"))
                .build());

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brandId, storeId);
    }

    @Test
    @DisplayName("매장 대시보드 조회 - 정상 응답")
    void getStoreDashboard_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/store/" + storeId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isNotEmpty());
    }

    @Test
    @DisplayName("매장 대시보드 - 부족 재고 카운트 포함")
    void getStoreDashboard_includesLowStockCount() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/store/" + storeId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lowStockCount").isNumber());
    }

    @Test
    @DisplayName("브랜드 대시보드 조회 - 정상 응답")
    void getBrandDashboard_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/brand/" + brandId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isNotEmpty());
    }
}
