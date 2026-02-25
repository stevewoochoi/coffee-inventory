package com.coffee.domain.org;

import com.coffee.common.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
class OrgControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    private String superAdminToken;
    private String brandAdminToken;
    private String storeManagerToken;

    @BeforeEach
    void setUp() {
        superAdminToken = jwtUtil.generateAccessToken(1L, "super@coffee.com", "SUPER_ADMIN", 1L, null, null);
        brandAdminToken = jwtUtil.generateAccessToken(2L, "brand@coffee.com", "BRAND_ADMIN", 1L, 1L, null);
        storeManagerToken = jwtUtil.generateAccessToken(3L, "store@coffee.com", "STORE_MANAGER", 1L, 1L, 1L);
    }

    @Nested
    @DisplayName("Company API")
    class CompanyApiTest {

        @Test
        @DisplayName("SUPER_ADMIN - Company CRUD 성공")
        void superAdminCompanyCrud() throws Exception {
            // Create
            String body = objectMapper.writeValueAsString(Map.of("name", "Test Company"));
            MvcResult createResult = mockMvc.perform(post("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.name").value("Test Company"))
                    .andReturn();

            Long companyId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                    .path("data").path("id").asLong();

            // Read
            mockMvc.perform(get("/api/v1/org/companies/" + companyId)
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Test Company"));

            // Update
            String updateBody = objectMapper.writeValueAsString(Map.of("name", "Updated Company"));
            mockMvc.perform(put("/api/v1/org/companies/" + companyId)
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updateBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Updated Company"));

            // List
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));

            // Delete
            mockMvc.perform(delete("/api/v1/org/companies/" + companyId)
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("BRAND_ADMIN - Company API 접근 거부")
        void brandAdminCompanyAccessDenied() throws Exception {
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("STORE_MANAGER - Company API 접근 거부")
        void storeManagerCompanyAccessDenied() throws Exception {
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + storeManagerToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("존재하지 않는 Company 조회 시 404")
        void companyNotFound() throws Exception {
            mockMvc.perform(get("/api/v1/org/companies/99999")
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Brand API")
    class BrandApiTest {

        private Long createCompany() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of("name", "Test Company"));
            MvcResult result = mockMvc.perform(post("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andReturn();
            return objectMapper.readTree(result.getResponse().getContentAsString())
                    .path("data").path("id").asLong();
        }

        @Test
        @DisplayName("SUPER_ADMIN - Brand CRUD 성공")
        void superAdminBrandCrud() throws Exception {
            Long companyId = createCompany();

            // Create
            String body = objectMapper.writeValueAsString(Map.of("companyId", companyId, "name", "Test Brand"));
            MvcResult createResult = mockMvc.perform(post("/api/v1/org/brands")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.name").value("Test Brand"))
                    .andExpect(jsonPath("$.data.companyId").value(companyId))
                    .andReturn();

            Long brandId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                    .path("data").path("id").asLong();

            // Read
            mockMvc.perform(get("/api/v1/org/brands/" + brandId)
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Test Brand"));

            // List by companyId
            mockMvc.perform(get("/api/v1/org/brands")
                            .param("companyId", companyId.toString())
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(1)));

            // Update
            String updateBody = objectMapper.writeValueAsString(Map.of("companyId", companyId, "name", "Updated Brand"));
            mockMvc.perform(put("/api/v1/org/brands/" + brandId)
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updateBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Updated Brand"));

            // Delete
            mockMvc.perform(delete("/api/v1/org/brands/" + brandId)
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("존재하지 않는 Company로 Brand 생성 시 404")
        void brandCreateWithInvalidCompany() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of("companyId", 99999, "name", "Orphan Brand"));
            mockMvc.perform(post("/api/v1/org/brands")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Store API")
    class StoreApiTest {

        private Long companyId;
        private Long brandId;

        @BeforeEach
        void setUpOrg() throws Exception {
            String companyBody = objectMapper.writeValueAsString(Map.of("name", "Test Company"));
            MvcResult companyResult = mockMvc.perform(post("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(companyBody))
                    .andReturn();
            companyId = objectMapper.readTree(companyResult.getResponse().getContentAsString())
                    .path("data").path("id").asLong();

            String brandBody = objectMapper.writeValueAsString(Map.of("companyId", companyId, "name", "Test Brand"));
            MvcResult brandResult = mockMvc.perform(post("/api/v1/org/brands")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(brandBody))
                    .andReturn();
            brandId = objectMapper.readTree(brandResult.getResponse().getContentAsString())
                    .path("data").path("id").asLong();
        }

        @Test
        @DisplayName("SUPER_ADMIN - Store CRUD 성공")
        void superAdminStoreCrud() throws Exception {
            // Create
            String body = objectMapper.writeValueAsString(Map.of("brandId", brandId, "name", "Shibuya Store"));
            MvcResult createResult = mockMvc.perform(post("/api/v1/org/stores")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.name").value("Shibuya Store"))
                    .andExpect(jsonPath("$.data.timezone").value("Asia/Tokyo"))
                    .andReturn();

            Long storeId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                    .path("data").path("id").asLong();

            // Read
            mockMvc.perform(get("/api/v1/org/stores/" + storeId)
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Shibuya Store"));

            // List by brandId
            mockMvc.perform(get("/api/v1/org/stores")
                            .param("brandId", brandId.toString())
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(1)));

            // Update
            String updateBody = objectMapper.writeValueAsString(
                    Map.of("brandId", brandId, "name", "Shinjuku Store", "timezone", "Asia/Seoul"));
            mockMvc.perform(put("/api/v1/org/stores/" + storeId)
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updateBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Shinjuku Store"))
                    .andExpect(jsonPath("$.data.timezone").value("Asia/Seoul"));

            // Delete
            mockMvc.perform(delete("/api/v1/org/stores/" + storeId)
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("존재하지 않는 Brand로 Store 생성 시 404")
        void storeCreateWithInvalidBrand() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of("brandId", 99999, "name", "Orphan Store"));
            mockMvc.perform(post("/api/v1/org/stores")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound());
        }
    }
}
