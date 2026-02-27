package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
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
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FulfillmentStatusTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private OrderPlanRepository planRepository;

    private String token;
    private Long storeId;
    private Long supplierId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brand.getId()).name("Supplier").build());
        supplierId = supplier.getId();

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "BRAND_ADMIN",
                company.getId(), brand.getId(), null);
    }

    @Test
    @DisplayName("fulfillment 상태 변경 - 정상")
    void updateFulfillmentStatus_success() throws Exception {
        OrderPlan plan = planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplierId)
                .status(OrderStatus.CONFIRMED)
                .fulfillmentStatus("PENDING")
                .totalAmount(new BigDecimal("50000"))
                .build());

        String body = objectMapper.writeValueAsString(Map.of(
                "fulfillmentStatus", "PREPARING"
        ));

        mockMvc.perform(put("/api/v1/admin/ordering/plans/" + plan.getId() + "/fulfillment")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fulfillmentStatus").value("PREPARING"));
    }

    @Test
    @DisplayName("관리자 발주 목록 조회")
    void getAdminPlans_returnsList() throws Exception {
        planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplierId)
                .status(OrderStatus.CONFIRMED)
                .fulfillmentStatus("PENDING")
                .totalAmount(BigDecimal.ZERO)
                .build());
        planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplierId)
                .status(OrderStatus.DISPATCHED)
                .fulfillmentStatus("SHIPPED")
                .totalAmount(BigDecimal.ZERO)
                .build());

        mockMvc.perform(get("/api/v1/admin/ordering/plans")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.plans").isArray());
    }

    @Test
    @DisplayName("관리자 발주 상세 조회")
    void getAdminPlan_returnsDetail() throws Exception {
        OrderPlan plan = planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplierId)
                .status(OrderStatus.CONFIRMED)
                .fulfillmentStatus("PENDING")
                .totalAmount(new BigDecimal("30000"))
                .vatAmount(new BigDecimal("3000"))
                .build());

        mockMvc.perform(get("/api/v1/admin/ordering/plans/" + plan.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(plan.getId()))
                .andExpect(jsonPath("$.data.fulfillmentStatus").value("PENDING"));
    }
}
