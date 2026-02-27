package com.coffee.domain.inventory;

import com.coffee.common.util.JwtUtil;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SoldoutManagementTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;

    private String token;
    private Long storeId;
    private Long itemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item item = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Iced Tea").baseUnit("ml").build());
        itemId = item.getId();

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("품절 등록 - 정상")
    void registerSoldout_success() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "itemId", itemId,
                "reason", "Out of ingredients"
        ));

        mockMvc.perform(post("/api/v1/soldout/register")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.itemId").value(itemId))
                .andExpect(jsonPath("$.data.isActive").value(true));
    }

    @Test
    @DisplayName("품절 목록 조회")
    void getSoldoutProducts_returnsList() throws Exception {
        // Register soldout
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "itemId", itemId,
                "reason", "Sold out"
        ));
        mockMvc.perform(post("/api/v1/soldout/register")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Get list
        mockMvc.perform(get("/api/v1/soldout/products")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.activeCount").value(1));
    }

    @Test
    @DisplayName("품절 해제")
    void resolveSoldout_success() throws Exception {
        // Register
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "itemId", itemId,
                "reason", "Sold out"
        ));
        MvcResult result = mockMvc.perform(post("/api/v1/soldout/register")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Long soldoutId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Delete/resolve
        mockMvc.perform(delete("/api/v1/soldout/" + soldoutId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Verify list is empty (active only)
        mockMvc.perform(get("/api/v1/soldout/products")
                        .param("storeId", storeId.toString())
                        .param("activeOnly", "true")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activeCount").value(0));
    }
}
