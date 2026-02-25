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
class PackagingControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private ItemRepository itemRepository;

    private String token;
    private Long itemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Item item = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("원두").baseUnit("g").build());
        itemId = item.getId();
        token = jwtUtil.generateAccessToken(1L, "a@t.com", "SUPER_ADMIN", company.getId(), brand.getId(), null);
    }

    @Test
    @DisplayName("Packaging 생성 → 조회 → DEPRECATED 처리")
    void packagingLifecycle() throws Exception {
        // Create
        String body = objectMapper.writeValueAsString(Map.of(
                "itemId", itemId, "packName", "1kg 봉지", "unitsPerPack", 1000, "packBarcode", "4901234567890"));

        MvcResult result = mockMvc.perform(post("/api/v1/master/packagings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.packName").value("1kg 봉지"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andReturn();

        Long packagingId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // List by itemId
        mockMvc.perform(get("/api/v1/master/packagings")
                        .param("itemId", itemId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        // Deprecate
        mockMvc.perform(delete("/api/v1/master/packagings/" + packagingId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // DEPRECATED 후 목록에서 제외
        mockMvc.perform(get("/api/v1/master/packagings")
                        .param("itemId", itemId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }
}
