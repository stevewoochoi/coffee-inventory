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

import java.util.HashMap;
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
                .andExpect(jsonPath("$.data.level").value(1))
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

    @Test
    @DisplayName("L1→L2→L3 계층 생성 및 조회")
    void hierarchyCrudFlow() throws Exception {
        // Create L1
        MvcResult l1Result = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brandId", brandId, "name", "원두", "code", "BEAN", "displayOrder", 1))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.level").value(1))
                .andExpect(jsonPath("$.data.parentId").isEmpty())
                .andReturn();

        Long l1Id = objectMapper.readTree(l1Result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Create L2 under L1
        Map<String, Object> l2Body = new HashMap<>();
        l2Body.put("brandId", brandId);
        l2Body.put("name", "블렌드 원두");
        l2Body.put("parentId", l1Id);
        l2Body.put("code", "BLEND");

        MvcResult l2Result = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l2Body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.level").value(2))
                .andExpect(jsonPath("$.data.parentId").value(l1Id))
                .andReturn();

        Long l2Id = objectMapper.readTree(l2Result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Create L3 under L2
        Map<String, Object> l3Body = new HashMap<>();
        l3Body.put("brandId", brandId);
        l3Body.put("name", "에티오피아");
        l3Body.put("parentId", l2Id);
        l3Body.put("code", "ETH");

        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l3Body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.level").value(3))
                .andExpect(jsonPath("$.data.parentId").value(l2Id));

        // Query by level
        mockMvc.perform(get("/api/v1/master/categories")
                        .param("brandId", brandId.toString())
                        .param("level", "1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("원두"));

        // Query by parentId
        mockMvc.perform(get("/api/v1/master/categories")
                        .param("brandId", brandId.toString())
                        .param("parentId", l1Id.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("블렌드 원두"));
    }

    @Test
    @DisplayName("트리 엔드포인트 구조 검증")
    void treeEndpoint() throws Exception {
        // Create L1
        MvcResult l1Result = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brandId", brandId, "name", "원두"))))
                .andExpect(status().isCreated())
                .andReturn();

        Long l1Id = objectMapper.readTree(l1Result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Create L2
        Map<String, Object> l2Body = new HashMap<>();
        l2Body.put("brandId", brandId);
        l2Body.put("name", "싱글 오리진");
        l2Body.put("parentId", l1Id);

        MvcResult l2Result = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l2Body)))
                .andExpect(status().isCreated())
                .andReturn();

        Long l2Id = objectMapper.readTree(l2Result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Create L3
        Map<String, Object> l3Body = new HashMap<>();
        l3Body.put("brandId", brandId);
        l3Body.put("name", "콜롬비아");
        l3Body.put("parentId", l2Id);

        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l3Body)))
                .andExpect(status().isCreated());

        // Verify tree structure
        mockMvc.perform(get("/api/v1/master/categories/tree")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("원두"))
                .andExpect(jsonPath("$.data[0].children", hasSize(1)))
                .andExpect(jsonPath("$.data[0].children[0].name").value("싱글 오리진"))
                .andExpect(jsonPath("$.data[0].children[0].children", hasSize(1)))
                .andExpect(jsonPath("$.data[0].children[0].children[0].name").value("콜롬비아"));
    }

    @Test
    @DisplayName("L4 생성 시 400 에러")
    void maxLevelExceeded() throws Exception {
        // Create L1 -> L2 -> L3
        MvcResult l1 = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("brandId", brandId, "name", "L1"))))
                .andExpect(status().isCreated()).andReturn();
        Long l1Id = objectMapper.readTree(l1.getResponse().getContentAsString()).path("data").path("id").asLong();

        Map<String, Object> l2Body = new HashMap<>();
        l2Body.put("brandId", brandId);
        l2Body.put("name", "L2");
        l2Body.put("parentId", l1Id);
        MvcResult l2 = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l2Body)))
                .andExpect(status().isCreated()).andReturn();
        Long l2Id = objectMapper.readTree(l2.getResponse().getContentAsString()).path("data").path("id").asLong();

        Map<String, Object> l3Body = new HashMap<>();
        l3Body.put("brandId", brandId);
        l3Body.put("name", "L3");
        l3Body.put("parentId", l2Id);
        MvcResult l3 = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l3Body)))
                .andExpect(status().isCreated()).andReturn();
        Long l3Id = objectMapper.readTree(l3.getResponse().getContentAsString()).path("data").path("id").asLong();

        // Attempt L4 -> should fail
        Map<String, Object> l4Body = new HashMap<>();
        l4Body.put("brandId", brandId);
        l4Body.put("name", "L4");
        l4Body.put("parentId", l3Id);
        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l4Body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("L1 삭제 시 L2/L3 cascade 비활성화")
    void cascadeDelete() throws Exception {
        // Create L1 -> L2 -> L3
        MvcResult l1 = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("brandId", brandId, "name", "Root"))))
                .andExpect(status().isCreated()).andReturn();
        Long l1Id = objectMapper.readTree(l1.getResponse().getContentAsString()).path("data").path("id").asLong();

        Map<String, Object> l2Body = new HashMap<>();
        l2Body.put("brandId", brandId);
        l2Body.put("name", "Child");
        l2Body.put("parentId", l1Id);
        MvcResult l2 = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l2Body)))
                .andExpect(status().isCreated()).andReturn();
        Long l2Id = objectMapper.readTree(l2.getResponse().getContentAsString()).path("data").path("id").asLong();

        Map<String, Object> l3Body = new HashMap<>();
        l3Body.put("brandId", brandId);
        l3Body.put("name", "Grandchild");
        l3Body.put("parentId", l2Id);
        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(l3Body)))
                .andExpect(status().isCreated());

        // Delete L1 (cascade)
        mockMvc.perform(delete("/api/v1/master/categories/" + l1Id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // All should be inactive now
        mockMvc.perform(get("/api/v1/master/categories")
                        .param("brandId", brandId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("같은 parent 아래 중복 이름 차단, 다른 parent 아래 같은 이름 허용")
    void duplicateNameScoping() throws Exception {
        // Create two L1 categories
        MvcResult l1a = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("brandId", brandId, "name", "CategoryA"))))
                .andExpect(status().isCreated()).andReturn();
        Long l1aId = objectMapper.readTree(l1a.getResponse().getContentAsString()).path("data").path("id").asLong();

        MvcResult l1b = mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("brandId", brandId, "name", "CategoryB"))))
                .andExpect(status().isCreated()).andReturn();
        Long l1bId = objectMapper.readTree(l1b.getResponse().getContentAsString()).path("data").path("id").asLong();

        // Create "SubCat" under CategoryA -> OK
        Map<String, Object> subA = new HashMap<>();
        subA.put("brandId", brandId);
        subA.put("name", "SubCat");
        subA.put("parentId", l1aId);
        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(subA)))
                .andExpect(status().isCreated());

        // Create "SubCat" under CategoryB -> OK (different parent)
        Map<String, Object> subB = new HashMap<>();
        subB.put("brandId", brandId);
        subB.put("name", "SubCat");
        subB.put("parentId", l1bId);
        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(subB)))
                .andExpect(status().isCreated());

        // Create "SubCat" under CategoryA again -> CONFLICT
        mockMvc.perform(post("/api/v1/master/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(subA)))
                .andExpect(status().isConflict());
    }
}
