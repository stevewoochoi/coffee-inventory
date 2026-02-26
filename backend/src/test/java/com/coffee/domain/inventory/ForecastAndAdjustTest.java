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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ForecastAndAdjustTest {

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
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item item = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Coffee").baseUnit("g")
                .minStockQty(new BigDecimal("1000")).build());
        itemId = item.getId();

        inventoryService.recordStockChange(storeId, itemId,
                new BigDecimal("5000"), LedgerType.RECEIVE, null, null, null, null);

        for (int i = 0; i < 7; i++) {
            inventoryService.recordStockChange(storeId, itemId,
                    new BigDecimal("-100"), LedgerType.SELL, "POS", null, null, null);
        }

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("소진 예측 API")
    void forecastEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/forecast")
                        .param("storeId", storeId.toString())
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.items[0].itemName").value("Coffee"))
                .andExpect(jsonPath("$.data.items[0].daysUntilEmpty").isNumber())
                .andExpect(jsonPath("$.data.items[0].fillPercentage").isNumber())
                .andExpect(jsonPath("$.data.items[0].trend").isString());
    }

    @Test
    @DisplayName("재고 조정 API")
    void adjustEndpoint() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "itemId", itemId,
                "newQtyBaseUnit", 3000, "memo", "Actual count"));

        mockMvc.perform(post("/api/v1/inventory/adjust")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.previousQty").isNumber())
                .andExpect(jsonPath("$.data.newQty").value(3000))
                .andExpect(jsonPath("$.data.delta").isNumber());
    }
}
