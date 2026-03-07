package com.coffee.domain.master;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
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

import java.math.BigDecimal;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class BrandItemControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private ItemRepository itemRepository;

    private String superAdminToken;
    private String brandAdminToken;
    private Long brandId;
    private Long itemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Test Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Test Brand").build());
        brandId = brand.getId();

        Item item = itemRepository.save(Item.builder()
                .name("에스프레소 원두")
                .baseUnit("g")
                .lossRate(BigDecimal.ZERO)
                .build());
        itemId = item.getId();

        superAdminToken = jwtUtil.generateAccessToken(1L, "super@test.com", "SUPER_ADMIN", company.getId(), null, null);
        brandAdminToken = jwtUtil.generateAccessToken(2L, "brand@test.com", "BRAND_ADMIN", company.getId(), brandId, null);
    }

    @Test
    @DisplayName("SUPER_ADMIN - 마스터 상품을 브랜드에 배정")
    void assignItemToBrand() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "itemId", itemId, "price", 28000));

        mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.brandId").value(brandId))
                .andExpect(jsonPath("$.data.itemId").value(itemId))
                .andExpect(jsonPath("$.data.itemName").value("에스프레소 원두"))
                .andExpect(jsonPath("$.data.price").value(28000))
                .andExpect(jsonPath("$.data.isActive").value(true));
    }

    @Test
    @DisplayName("브랜드별 상품 목록 조회")
    void listBrandItems() throws Exception {
        // Assign first
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "itemId", itemId));
        mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // List
        mockMvc.perform(get("/api/v1/master/brand-items")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].itemName").value("에스프레소 원두"));
    }

    @Test
    @DisplayName("브랜드 상품 가격 수정")
    void updateBrandItemPrice() throws Exception {
        // Assign
        String assignBody = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "itemId", itemId, "price", 25000));
        MvcResult result = mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assignBody))
                .andExpect(status().isCreated())
                .andReturn();

        Long brandItemId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Update price
        String updateBody = objectMapper.writeValueAsString(Map.of(
                "price", 30000, "vatInclusive", false));
        mockMvc.perform(put("/api/v1/master/brand-items/" + brandItemId)
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.price").value(30000))
                .andExpect(jsonPath("$.data.vatInclusive").value(false));
    }

    @Test
    @DisplayName("브랜드 상품 배정 해제 (soft delete)")
    void unassignBrandItem() throws Exception {
        // Assign
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "itemId", itemId));
        MvcResult result = mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Long brandItemId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Unassign
        mockMvc.perform(delete("/api/v1/master/brand-items/" + brandItemId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk());

        // List should be empty
        mockMvc.perform(get("/api/v1/master/brand-items")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("중복 배정 시 기존 레코드 재활성화")
    void reassignDeactivatedItem() throws Exception {
        // Assign
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "itemId", itemId, "price", 20000));
        MvcResult result = mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Long brandItemId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Unassign
        mockMvc.perform(delete("/api/v1/master/brand-items/" + brandItemId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk());

        // Re-assign with new price
        String reBody = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "itemId", itemId, "price", 35000));
        mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.price").value(35000))
                .andExpect(jsonPath("$.data.isActive").value(true));
    }

    @Test
    @DisplayName("BRAND_ADMIN - 배정은 불가, 조회/수정은 가능")
    void brandAdminPermissions() throws Exception {
        // Assign not allowed
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "itemId", itemId));
        mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + brandAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());

        // Assign as SUPER_ADMIN first
        MvcResult result = mockMvc.perform(post("/api/v1/master/brand-items")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Long brandItemId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // List as BRAND_ADMIN
        mockMvc.perform(get("/api/v1/master/brand-items")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + brandAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        // Update price as BRAND_ADMIN
        String updateBody = objectMapper.writeValueAsString(Map.of("price", 32000));
        mockMvc.perform(put("/api/v1/master/brand-items/" + brandItemId)
                        .header("Authorization", "Bearer " + brandAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.price").value(32000));
    }
}
