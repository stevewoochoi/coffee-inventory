package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
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
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OrderCartFlowTest {

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

    private String token;
    private Long storeId;
    private Long userId = 1L;
    private Long supplier1Id;
    private Long supplier2Id;
    private Long packaging1Id;
    private Long packaging2Id;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item item1 = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Coffee").baseUnit("g").build());
        Item item2 = itemRepository.save(Item.builder()
                .brandId(brand.getId()).name("Milk").baseUnit("ml").build());

        Packaging pkg1 = packagingRepository.save(Packaging.builder()
                .itemId(item1.getId()).packName("1kg Coffee")
                .unitsPerPack(new BigDecimal("1000")).build());
        Packaging pkg2 = packagingRepository.save(Packaging.builder()
                .itemId(item2.getId()).packName("1L Milk")
                .unitsPerPack(new BigDecimal("1000")).build());
        packaging1Id = pkg1.getId();
        packaging2Id = pkg2.getId();

        Supplier sup1 = supplierRepository.save(Supplier.builder()
                .brandId(brand.getId()).name("Supplier A").build());
        Supplier sup2 = supplierRepository.save(Supplier.builder()
                .brandId(brand.getId()).name("Supplier B").build());
        supplier1Id = sup1.getId();
        supplier2Id = sup2.getId();

        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier1Id).packagingId(packaging1Id)
                .price(new BigDecimal("10000")).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier2Id).packagingId(packaging2Id)
                .price(new BigDecimal("5000")).build());

        token = jwtUtil.generateAccessToken(userId, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("장바구니 CRUD + 확정 → 2개 공급사 → 2개 OrderPlan")
    void cartCrudAndConfirm() throws Exception {
        // 1. Add item to cart (supplier 1)
        String addBody1 = objectMapper.writeValueAsString(Map.of(
                "packagingId", packaging1Id, "supplierId", supplier1Id, "packQty", 3));
        MvcResult addResult = mockMvc.perform(post("/api/v1/ordering/cart/items")
                        .param("storeId", storeId.toString())
                        .param("userId", userId.toString())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addBody1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andReturn();

        // 2. Add item to cart (supplier 2)
        String addBody2 = objectMapper.writeValueAsString(Map.of(
                "packagingId", packaging2Id, "supplierId", supplier2Id, "packQty", 5));
        mockMvc.perform(post("/api/v1/ordering/cart/items")
                        .param("storeId", storeId.toString())
                        .param("userId", userId.toString())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addBody2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.totalItems").value(2))
                .andExpect(jsonPath("$.data.supplierGroups", hasSize(2)));

        // 3. Get cart
        mockMvc.perform(get("/api/v1/ordering/cart")
                        .param("storeId", storeId.toString())
                        .param("userId", userId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItems").value(2));

        // 4. Update item qty
        Long cartItemId = objectMapper.readTree(addResult.getResponse().getContentAsString())
                .path("data").path("supplierGroups").get(0).path("items").get(0).path("id").asLong();
        String updateBody = objectMapper.writeValueAsString(Map.of("packQty", 10));
        mockMvc.perform(put("/api/v1/ordering/cart/items/" + cartItemId)
                        .param("storeId", storeId.toString())
                        .param("userId", userId.toString())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk());

        // 5. Confirm cart → should create 2 OrderPlans
        mockMvc.perform(post("/api/v1/ordering/cart/confirm")
                        .param("storeId", storeId.toString())
                        .param("userId", userId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.orderCount").value(2))
                .andExpect(jsonPath("$.data.orderPlanIds", hasSize(2)));

        // 6. Cart should be empty now
        mockMvc.perform(get("/api/v1/ordering/cart")
                        .param("storeId", storeId.toString())
                        .param("userId", userId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItems").value(0));
    }

    @Test
    @DisplayName("빈 카트 확정 시 에러")
    void confirmEmptyCartFails() throws Exception {
        mockMvc.perform(post("/api/v1/ordering/cart/confirm")
                        .param("storeId", storeId.toString())
                        .param("userId", userId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }
}
