package com.coffee.domain.master;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
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
class SupplierControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;

    private String token;
    private Long brandId;
    private Long packagingId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        brandId = brand.getId();

        Item item = itemRepository.save(Item.builder()
                .brandId(brandId).name("원두").baseUnit("g").build());
        Packaging packaging = packagingRepository.save(Packaging.builder()
                .itemId(item.getId()).packName("1kg").unitsPerPack(new BigDecimal("1000")).build());
        packagingId = packaging.getId();

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "SUPER_ADMIN", company.getId(), brandId, null);
    }

    @Test
    @DisplayName("Supplier CRUD + SupplierItem 연결")
    void supplierCrudWithItems() throws Exception {
        // Create Supplier
        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "name", "원두 공급사", "email", "supplier@test.com"));

        MvcResult result = mockMvc.perform(post("/api/v1/master/suppliers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("원두 공급사"))
                .andExpect(jsonPath("$.data.orderMethod").value("EMAIL"))
                .andReturn();

        Long supplierId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // List
        mockMvc.perform(get("/api/v1/master/suppliers")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        // Update
        String updateBody = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "name", "Updated Supplier", "orderMethod", "PORTAL"));
        mockMvc.perform(put("/api/v1/master/suppliers/" + supplierId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Updated Supplier"))
                .andExpect(jsonPath("$.data.orderMethod").value("PORTAL"));

        // Create SupplierItem
        String siBody = objectMapper.writeValueAsString(Map.of(
                "supplierId", supplierId, "packagingId", packagingId,
                "supplierSku", "SKU-001", "leadTimeDays", 3, "price", 5000));

        MvcResult siResult = mockMvc.perform(post("/api/v1/master/suppliers/" + supplierId + "/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(siBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.supplierSku").value("SKU-001"))
                .andExpect(jsonPath("$.data.leadTimeDays").value(3))
                .andReturn();

        Long siId = objectMapper.readTree(siResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // List SupplierItems
        mockMvc.perform(get("/api/v1/master/suppliers/" + supplierId + "/items")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        // Delete SupplierItem
        mockMvc.perform(delete("/api/v1/master/suppliers/" + supplierId + "/items/" + siId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Delete Supplier
        mockMvc.perform(delete("/api/v1/master/suppliers/" + supplierId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}
