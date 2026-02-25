package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
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
class OrderingFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierItemRepository supplierItemRepository;
    @Autowired private InventoryService inventoryService;

    private String token;
    private Long storeId;
    private Long supplierId;
    private Long packagingId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item coffee = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Coffee Bean").baseUnit("g")
                .lossRate(new BigDecimal("0.05")).build());

        Packaging packaging = packagingRepository.save(Packaging.builder()
                .itemId(coffee.getId()).packName("1kg Pack")
                .unitsPerPack(new BigDecimal("1000")).build());
        packagingId = packaging.getId();

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brand.getId()).name("Bean Supplier").email("s@t.com").build());
        supplierId = supplier.getId();

        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplierId).packagingId(packagingId)
                .leadTimeDays(2).price(new BigDecimal("15000")).build());

        // 현재 재고: 3000g
        inventoryService.recordStockChange(storeId, coffee.getId(),
                new BigDecimal("3000"), LedgerType.RECEIVE, null, null, null, null);

        // 최근 판매 소모 기록 (SELL 타입 - 음수 qty)
        for (int i = 0; i < 7; i++) {
            inventoryService.recordStockChange(storeId, coffee.getId(),
                    new BigDecimal("-200"), LedgerType.SELL, "POS_SALES", null, null, null);
        }

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("발주 생성 → 확정 → 발송 흐름")
    void orderCreateConfirmDispatchFlow() throws Exception {
        // 1. 발주 생성
        String createBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "supplierId", supplierId,
                "lines", List.of(Map.of("packagingId", packagingId, "packQty", 5))
        ));

        MvcResult createResult = mockMvc.perform(post("/api/v1/ordering/plans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andReturn();

        Integer planId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asInt();

        // 2. 발주 확정
        mockMvc.perform(put("/api/v1/ordering/plans/" + planId + "/confirm")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));

        // 3. 발주 발송
        mockMvc.perform(post("/api/v1/ordering/plans/" + planId + "/dispatch")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DISPATCHED"));

        // 4. 목록 조회
        mockMvc.perform(get("/api/v1/ordering/plans")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].status").value("DISPATCHED"));
    }

    @Test
    @DisplayName("DRAFT가 아닌 발주는 확정 불가")
    void cannotConfirmNonDraftOrder() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "supplierId", supplierId));

        MvcResult result = mockMvc.perform(post("/api/v1/ordering/plans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        Integer planId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asInt();

        // 확정
        mockMvc.perform(put("/api/v1/ordering/plans/" + planId + "/confirm")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // 이미 CONFIRMED인 주문을 다시 확정 시도 → 400
        mockMvc.perform(put("/api/v1/ordering/plans/" + planId + "/confirm")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("발주 추천 수량 계산")
    void orderSuggestion() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/suggestion")
                        .param("storeId", storeId.toString())
                        .param("supplierId", supplierId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.storeId").value(storeId))
                .andExpect(jsonPath("$.data.supplierId").value(supplierId))
                .andExpect(jsonPath("$.data.lines", hasSize(1)))
                .andExpect(jsonPath("$.data.lines[0].itemName").value("Coffee Bean"))
                .andExpect(jsonPath("$.data.lines[0].suggestedPackQty").isNumber());
    }
}
