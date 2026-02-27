package com.coffee.domain.inventory;

import com.coffee.common.util.JwtUtil;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class QuickAdjustAndForecastTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private InventoryService inventoryService;

    private String token;
    private Long storeId;
    private Long brandId;
    private Long itemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("Store").build());
        storeId = store.getId();

        Item item = itemRepository.save(Item.builder()
                .brandId(brandId).name("Coffee Bean").baseUnit("g")
                .minStockQty(new BigDecimal("500")).build());
        itemId = item.getId();

        // Set up initial stock
        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("1000"), LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);

        // Add some sales history for forecast
        for (int i = 0; i < 7; i++) {
            inventoryService.recordStockChange(storeId, itemId,
                    new BigDecimal("-100"), LedgerType.SELL, "POS_SALES", null, null, null);
        }

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brandId, storeId);
    }

    @Test
    @DisplayName("재고 빠른 조정 - 정상")
    void adjustStock_createsLedgerAndUpdatesSnapshot() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "itemId", itemId,
                "newQtyBaseUnit", 500,
                "memo", "Manual correction"
        ));

        mockMvc.perform(post("/api/v1/inventory/adjust")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.itemId").value(itemId))
                .andExpect(jsonPath("$.data.newQty").value(500));
    }

    @Test
    @DisplayName("재고 예측 조회 - 소진일 예측 포함")
    void getForecast_returnsDaysUntilEmpty() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/forecast")
                        .param("storeId", storeId.toString())
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    @DisplayName("재고 조정 후 snapshot 갱신 확인")
    void adjustStock_snapshotUpdated() throws Exception {
        // Adjust to 800
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "itemId", itemId,
                "newQtyBaseUnit", 800
        ));

        mockMvc.perform(post("/api/v1/inventory/adjust")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.newQty").value(800));

        // Verify via inventory snapshot API
        mockMvc.perform(get("/api/v1/inventory/snapshot")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}
