package com.coffee.domain.master;

import com.coffee.common.util.JwtUtil;
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
class ItemCategoryControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;

    private String token;
    private Long brandId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());

        token = jwtUtil.generateAccessToken(1L, "admin@test.com", "BRAND_ADMIN",
                company.getId(), brand.getId(), store.getId());
    }

    @Test
    @DisplayName("카테고리 CRUD 흐름")
    void categoryCrudFlow() throws Exception {
        // Create
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "name", "Coffee Beans", "displayOrder", 1));
        MvcResult createResult = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Coffee Beans"))
                .andReturn();

        Long categoryId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Create another
        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brandId", brandId, "name", "Dairy", "displayOrder", 2))))
                .andExpect(status().isCreated());

        // List
        mockMvc.perform(get("/api/v1/master/categories")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        // Update
        mockMvc.perform(put("/api/v1/master/categories/" + categoryId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brandId", brandId, "name", "Premium Beans", "displayOrder", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Premium Beans"));

        // Delete (soft)
        mockMvc.perform(delete("/api/v1/master/categories/" + categoryId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // List should show only 1 active
        mockMvc.perform(get("/api/v1/master/categories")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));
    }

    @Test
    @DisplayName("중복 카테고리 생성 시 에러")
    void duplicateCategoryFails() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "name", "Coffee Beans"));

        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }
}
