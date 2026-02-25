package com.coffee.domain.master;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
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
class ItemControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;

    private String superAdminToken;
    private String storeManagerToken;
    private Long brandId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Test Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Test Brand").build());
        brandId = brand.getId();

        superAdminToken = jwtUtil.generateAccessToken(1L, "super@test.com", "SUPER_ADMIN", company.getId(), null, null);
        storeManagerToken = jwtUtil.generateAccessToken(3L, "store@test.com", "STORE_MANAGER", company.getId(), brandId, 1L);
    }

    @Test
    @DisplayName("Item CRUD 전체 흐름")
    void itemCrudFlow() throws Exception {
        // Create
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "name", "원두 (브라질)", "category", "원두", "baseUnit", "g", "lossRate", 0.02));

        MvcResult createResult = mockMvc.perform(post("/api/v1/master/items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("원두 (브라질)"))
                .andExpect(jsonPath("$.data.baseUnit").value("g"))
                .andExpect(jsonPath("$.data.isActive").value(true))
                .andReturn();

        Long itemId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Read
        mockMvc.perform(get("/api/v1/master/items/" + itemId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("원두 (브라질)"));

        // List by brandId with paging
        mockMvc.perform(get("/api/v1/master/items")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.totalElements").value(1));

        // Update
        String updateBody = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "name", "원두 (콜롬비아)", "baseUnit", "g"));
        mockMvc.perform(put("/api/v1/master/items/" + itemId)
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("원두 (콜롬비아)"));

        // Delete (soft delete)
        mockMvc.perform(delete("/api/v1/master/items/" + itemId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk());

        // 삭제 후 조회 시 404
        mockMvc.perform(get("/api/v1/master/items/" + itemId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isNotFound());

        // 삭제 후 목록에서 제외
        mockMvc.perform(get("/api/v1/master/items")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("STORE_MANAGER - Item API 접근 거부")
    void storeManagerAccessDenied() throws Exception {
        mockMvc.perform(get("/api/v1/master/items")
                        .header("Authorization", "Bearer " + storeManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("존재하지 않는 Brand로 Item 생성 시 404")
    void createItemWithInvalidBrand() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", 99999, "name", "test", "baseUnit", "EA"));
        mockMvc.perform(post("/api/v1/master/items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("필수 필드 누락 시 400")
    void createItemWithoutRequiredFields() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("brandId", brandId));
        mockMvc.perform(post("/api/v1/master/items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
