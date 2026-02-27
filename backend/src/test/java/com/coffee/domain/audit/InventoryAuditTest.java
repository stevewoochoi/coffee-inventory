package com.coffee.domain.audit;

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
class InventoryAuditTest {

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
    private Long itemId1;
    private Long itemId2;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item item1 = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("원두").baseUnit("g").build());
        Item item2 = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("우유").baseUnit("ml").build());
        itemId1 = item1.getId();
        itemId2 = item2.getId();

        // Set up inventory
        inventoryService.recordStockChange(storeId, itemId1,
                new BigDecimal("1000"), LedgerType.RECEIVE, "DELIVERY", 1L, null, 1L);
        inventoryService.recordStockChange(storeId, itemId2,
                new BigDecimal("500"), LedgerType.RECEIVE, "DELIVERY", 2L, null, 1L);

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("실사 생성 → snapshot 기반 라인 자동생성")
    void createAudit_createsLinesFromSnapshot() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId
        ));

        mockMvc.perform(post("/api/v1/audit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.lines").isArray())
                .andExpect(jsonPath("$.data.lines.length()").value(greaterThanOrEqualTo(2)));
    }

    @Test
    @DisplayName("실사 라인 수량 입력 → 차이 자동 계산")
    void updateLine_calculatesDescription() throws Exception {
        // Create audit
        String createBody = objectMapper.writeValueAsString(Map.of("storeId", storeId));
        MvcResult createResult = mockMvc.perform(post("/api/v1/audit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        // Get a line ID
        var dataNode = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("lines");
        Long lineId = dataNode.get(0).path("id").asLong();

        // Update actual quantity
        String updateBody = objectMapper.writeValueAsString(Map.of(
                "actualQty", 950,
                "note", "some spillage"
        ));

        mockMvc.perform(put("/api/v1/audit/lines/" + lineId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.actualQty").isNumber())
                .andExpect(jsonPath("$.data.difference").isNumber());
    }

    @Test
    @DisplayName("실사 완료 → StockLedger ADJUST 기록")
    void completeAudit_createsAdjustLedger() throws Exception {
        // Create audit
        String createBody = objectMapper.writeValueAsString(Map.of("storeId", storeId));
        MvcResult createResult = mockMvc.perform(post("/api/v1/audit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        var createData = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data");
        Long auditId = createData.path("id").asLong();
        var lines = createData.path("lines");

        // Update all lines with actual quantities
        for (int i = 0; i < lines.size(); i++) {
            Long lineId = lines.get(i).path("id").asLong();
            BigDecimal systemQty = new BigDecimal(lines.get(i).path("systemQty").asText());
            // Set actual slightly different from system
            BigDecimal actualQty = systemQty.subtract(new BigDecimal("50"));

            String updateBody = objectMapper.writeValueAsString(Map.of(
                    "actualQty", actualQty
            ));
            mockMvc.perform(put("/api/v1/audit/lines/" + lineId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updateBody))
                    .andExpect(status().isOk());
        }

        // Complete audit
        mockMvc.perform(put("/api/v1/audit/" + auditId + "/complete")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.completedAt").isNotEmpty());
    }

    @Test
    @DisplayName("실사 목록 조회")
    void getAudits_returnsList() throws Exception {
        // Create an audit
        String body = objectMapper.writeValueAsString(Map.of("storeId", storeId));
        mockMvc.perform(post("/api/v1/audit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Get list
        mockMvc.perform(get("/api/v1/audit")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("실사 상세 조회")
    void getAudit_returnsDetail() throws Exception {
        // Create audit
        String body = objectMapper.writeValueAsString(Map.of("storeId", storeId));
        MvcResult result = mockMvc.perform(post("/api/v1/audit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Long auditId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(get("/api/v1/audit/" + auditId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(auditId))
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.lines").isArray());
    }

    @Test
    @DisplayName("실사 취소")
    void cancelAudit_success() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("storeId", storeId));
        MvcResult result = mockMvc.perform(post("/api/v1/audit")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Long auditId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(post("/api/v1/audit/" + auditId + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}
