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
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OrderReceivingFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private OrderPlanRepository orderPlanRepository;
    @Autowired private OrderLineRepository orderLineRepository;
    @Autowired private InventorySnapshotRepository snapshotRepository;

    private String token;
    private Long storeId;
    private Long supplierId;
    private Long packagingId1;
    private Long packagingId2;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item item1 = itemRepository.save(Item.builder().brandId(brand.getId()).name("원두A").baseUnit("g").build());
        Item item2 = itemRepository.save(Item.builder().brandId(brand.getId()).name("우유B").baseUnit("ml").build());

        Packaging pkg1 = packagingRepository.save(Packaging.builder()
                .itemId(item1.getId()).packName("1kg").unitsPerPack(new BigDecimal("1000")).build());
        packagingId1 = pkg1.getId();

        Packaging pkg2 = packagingRepository.save(Packaging.builder()
                .itemId(item2.getId()).packName("1L").unitsPerPack(new BigDecimal("1000")).build());
        packagingId2 = pkg2.getId();

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brand.getId()).name("Supplier").build());
        supplierId = supplier.getId();

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("전체 입고 시 발주 상태 DELIVERED로 전이")
    void fullReceiveChangesStatusToDelivered() throws Exception {
        // Create a confirmed order with 2 lines
        OrderPlan plan = orderPlanRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplierId).status(OrderStatus.CONFIRMED).build());
        orderLineRepository.save(OrderLine.builder()
                .orderPlanId(plan.getId()).packagingId(packagingId1).packQty(3).build());
        orderLineRepository.save(OrderLine.builder()
                .orderPlanId(plan.getId()).packagingId(packagingId2).packQty(2).build());

        // Verify pending orders API
        mockMvc.perform(get("/api/v1/receiving/pending-orders")
                        .header("Authorization", "Bearer " + token)
                        .param("storeId", storeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].orderPlanId").value(plan.getId()));

        // Receive full quantities
        String body = objectMapper.writeValueAsString(Map.of("lines", List.of(
                Map.of("packagingId", packagingId1, "packQty", 3),
                Map.of("packagingId", packagingId2, "packQty", 2)
        )));

        mockMvc.perform(post("/api/v1/receiving/from-order/" + plan.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        // Verify order status changed to DELIVERED
        OrderPlan updated = orderPlanRepository.findById(plan.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.DELIVERED);

        // Verify inventory was updated (3 packs * 1000g = 3000g for item1)
        Optional<InventorySnapshot> snap1 = snapshotRepository.findByStoreIdAndItemId(storeId,
                packagingRepository.findById(packagingId1).orElseThrow().getItemId());
        assertThat(snap1).isPresent();
        assertThat(snap1.get().getQtyBaseUnit()).isEqualByComparingTo("3000");
    }

    @Test
    @DisplayName("부분 입고 시 발주 상태 PARTIALLY_RECEIVED로 전이")
    void partialReceiveChangesStatusToPartiallyReceived() throws Exception {
        OrderPlan plan = orderPlanRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplierId).status(OrderStatus.DISPATCHED).build());
        orderLineRepository.save(OrderLine.builder()
                .orderPlanId(plan.getId()).packagingId(packagingId1).packQty(5).build());
        orderLineRepository.save(OrderLine.builder()
                .orderPlanId(plan.getId()).packagingId(packagingId2).packQty(3).build());

        // Receive only partial (2 out of 5 for pkg1, skip pkg2)
        String body = objectMapper.writeValueAsString(Map.of("lines", List.of(
                Map.of("packagingId", packagingId1, "packQty", 2)
        )));

        mockMvc.perform(post("/api/v1/receiving/from-order/" + plan.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        // Verify order status changed to PARTIALLY_RECEIVED
        OrderPlan updated = orderPlanRepository.findById(plan.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.PARTIALLY_RECEIVED);
    }
}
