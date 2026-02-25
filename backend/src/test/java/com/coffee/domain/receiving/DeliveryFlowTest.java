package com.coffee.domain.receiving;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DeliveryFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private InventorySnapshotRepository snapshotRepository;

    private String token;
    private Long storeId;
    private Long supplierId;
    private Long packagingId;
    private Long itemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item item = itemRepository.save(Item.builder().brandId(brand.getId()).name("원두").baseUnit("g").build());
        itemId = item.getId();

        Packaging packaging = packagingRepository.save(Packaging.builder()
                .itemId(itemId).packName("1kg").unitsPerPack(new BigDecimal("1000")).build());
        packagingId = packaging.getId();

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brand.getId()).name("Supplier").build());
        supplierId = supplier.getId();

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("스캔 → 입고 확정 → 재고 증가 전체 흐름")
    void deliveryScanConfirmFlow() throws Exception {
        // 1. Delivery 생성
        String deliveryBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "supplierId", supplierId));

        MvcResult deliveryResult = mockMvc.perform(post("/api/v1/receiving/deliveries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(deliveryBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn();

        Long deliveryId = objectMapper.readTree(deliveryResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // 2. 바코드 스캔 (2팩)
        String scanBody = objectMapper.writeValueAsString(Map.of(
                "packagingId", packagingId, "packCountScanned", 2));

        mockMvc.perform(post("/api/v1/receiving/deliveries/" + deliveryId + "/scans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.packCountScanned").value(2));

        // 스캔 후 상태 IN_PROGRESS
        mockMvc.perform(get("/api/v1/receiving/deliveries/" + deliveryId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));

        // 3. 입고 확정
        mockMvc.perform(put("/api/v1/receiving/deliveries/" + deliveryId + "/confirm")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        // 4. 재고 확인 (1000 * 2 = 2000g)
        Optional<InventorySnapshot> snapshot = snapshotRepository.findByStoreIdAndItemId(storeId, itemId);
        assertThat(snapshot).isPresent();
        assertThat(snapshot.get().getQtyBaseUnit()).isEqualByComparingTo("2000");
    }

    @Test
    @DisplayName("확정된 Delivery에 추가 스캔 불가")
    void cannotScanCompletedDelivery() throws Exception {
        // Create & scan & confirm
        String deliveryBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "supplierId", supplierId));
        MvcResult result = mockMvc.perform(post("/api/v1/receiving/deliveries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(deliveryBody))
                .andReturn();
        Long deliveryId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        String scanBody = objectMapper.writeValueAsString(Map.of("packagingId", packagingId));
        mockMvc.perform(post("/api/v1/receiving/deliveries/" + deliveryId + "/scans")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(scanBody));

        mockMvc.perform(put("/api/v1/receiving/deliveries/" + deliveryId + "/confirm")
                .header("Authorization", "Bearer " + token));

        // Try to scan again
        mockMvc.perform(post("/api/v1/receiving/deliveries/" + deliveryId + "/scans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scanBody))
                .andExpect(status().isBadRequest());
    }
}
