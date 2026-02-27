package com.coffee.domain.claim;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.claim.dto.ClaimDto;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ClaimApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;

    private String token;
    private Long storeId;
    private Long itemId;
    private Long packagingId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item item = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Coffee Bean").baseUnit("g").build());
        itemId = item.getId();

        Packaging pkg = packagingRepository.save(Packaging.builder()
                .itemId(itemId).packName("1kg Coffee")
                .unitsPerPack(new BigDecimal("1000")).build());
        packagingId = pkg.getId();

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("클레임 등록 - 정상 생성")
    void createClaim_success() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "claimType", "DEFECTIVE",
                "description", "Received damaged coffee bags",
                "lines", List.of(Map.of(
                        "itemId", itemId,
                        "packagingId", packagingId,
                        "claimedQty", 2,
                        "reason", "Torn packaging"
                ))
        ));

        mockMvc.perform(post("/api/v1/claims")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.claimType").value("DEFECTIVE"))
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data.lines", hasSize(1)))
                .andExpect(jsonPath("$.data.lines[0].claimedQty").value(2));
    }

    @Test
    @DisplayName("클레임 목록 조회 - 상태별 필터링")
    void getClaims_filterByStatus() throws Exception {
        // Create a claim first
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "claimType", "SHORTAGE",
                "description", "Missing items"
        ));
        mockMvc.perform(post("/api/v1/claims")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Query by status
        mockMvc.perform(get("/api/v1/claims")
                        .param("storeId", storeId.toString())
                        .param("status", "SUBMITTED")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)));
    }

    @Test
    @DisplayName("클레임 상세 조회")
    void getClaimDetail_success() throws Exception {
        // Create claim
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "claimType", "WRONG_ITEM",
                "description", "Wrong item delivered",
                "lines", List.of(Map.of(
                        "itemId", itemId,
                        "claimedQty", 1,
                        "reason", "Expected milk, got juice"
                ))
        ));
        MvcResult createResult = mockMvc.perform(post("/api/v1/claims")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Long claimId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Get detail
        mockMvc.perform(get("/api/v1/claims/" + claimId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(claimId))
                .andExpect(jsonPath("$.data.claimType").value("WRONG_ITEM"))
                .andExpect(jsonPath("$.data.lines", hasSize(1)));
    }

    @Test
    @DisplayName("클레임 해결 - 상태 변경")
    void resolveClaim_success() throws Exception {
        // Create claim
        String createBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "claimType", "DAMAGE",
                "description", "Damaged goods"
        ));
        MvcResult createResult = mockMvc.perform(post("/api/v1/claims")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        Long claimId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Resolve
        String resolveBody = objectMapper.writeValueAsString(Map.of(
                "status", "RESOLVED",
                "resolutionNote", "Replacement sent"
        ));
        mockMvc.perform(put("/api/v1/claims/" + claimId + "/resolve")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resolveBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolutionNote").value("Replacement sent"));
    }

    @Test
    @DisplayName("클레임 이미지 첨부")
    void addClaimImage_success() throws Exception {
        // Create claim
        String createBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "claimType", "QUALITY",
                "description", "Bad quality"
        ));
        MvcResult createResult = mockMvc.perform(post("/api/v1/claims")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        Long claimId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Add image
        String imageBody = objectMapper.writeValueAsString(Map.of(
                "imageUrl", "https://s3.example.com/claim-photo-1.jpg"
        ));
        mockMvc.perform(post("/api/v1/claims/" + claimId + "/images")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(imageBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.imageUrl").value("https://s3.example.com/claim-photo-1.jpg"));
    }

    @Test
    @DisplayName("클레임 유형 목록 조회")
    void getClaimTypes_returnsAll() throws Exception {
        mockMvc.perform(get("/api/v1/claims/categories")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(4))))
                .andExpect(jsonPath("$.data", hasItem("DEFECTIVE")))
                .andExpect(jsonPath("$.data", hasItem("WRONG_ITEM")))
                .andExpect(jsonPath("$.data", hasItem("SHORTAGE")))
                .andExpect(jsonPath("$.data", hasItem("DAMAGE")));
    }
}
