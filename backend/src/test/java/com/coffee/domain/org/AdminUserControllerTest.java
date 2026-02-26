package com.coffee.domain.org;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.org.entity.*;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.org.repository.UserRepository;
import com.coffee.domain.org.repository.UserStoreRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminUserControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private UserStoreRepository userStoreRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;

    private String superAdminToken;
    private String brandAdminToken;
    private Long pendingUserId;
    private Long brandId;
    private Long storeId1;
    private Long storeId2;

    @BeforeEach
    void setUp() {
        userStoreRepository.deleteAll();
        userRepository.deleteAll();
        storeRepository.deleteAll();
        brandRepository.deleteAll();

        // Create brand and stores
        Brand brand = Brand.builder().companyId(1L).name("Test Brand").build();
        brand = brandRepository.save(brand);
        brandId = brand.getId();

        Store store1 = Store.builder().brandId(brandId).name("강남점").build();
        store1 = storeRepository.save(store1);
        storeId1 = store1.getId();

        Store store2 = Store.builder().brandId(brandId).name("역삼점").build();
        store2 = storeRepository.save(store2);
        storeId2 = store2.getId();

        // Create super admin
        User superAdmin = User.builder()
                .email("super@coffee.com")
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .role(Role.SUPER_ADMIN)
                .companyId(1L)
                .isActive(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        superAdmin = userRepository.save(superAdmin);
        superAdminToken = jwtUtil.generateAccessToken(
                superAdmin.getId(), superAdmin.getEmail(), "SUPER_ADMIN", 1L, null, null);

        // Create brand admin
        User brandAdmin = User.builder()
                .email("brand@coffee.com")
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .role(Role.BRAND_ADMIN)
                .companyId(1L)
                .brandId(brandId)
                .isActive(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        brandAdmin = userRepository.save(brandAdmin);
        brandAdminToken = jwtUtil.generateAccessToken(
                brandAdmin.getId(), brandAdmin.getEmail(), "BRAND_ADMIN", 1L, brandId, null);

        // Create pending user
        User pendingUser = User.builder()
                .email("pending@coffee.com")
                .name("Pending User")
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .role(Role.STORE_MANAGER)
                .isActive(true)
                .accountStatus(AccountStatus.PENDING_APPROVAL)
                .build();
        pendingUser = userRepository.save(pendingUser);
        pendingUserId = pendingUser.getId();
    }

    @Test
    @DisplayName("사용자 목록 조회 - SUPER_ADMIN")
    void getUsersList() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.totalElements").value(greaterThanOrEqualTo(3)));
    }

    @Test
    @DisplayName("사용자 목록 필터 - PENDING_APPROVAL 상태")
    void getUsersFilterByStatus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .param("status", "PENDING_APPROVAL")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].accountStatus").value("PENDING_APPROVAL"));
    }

    @Test
    @DisplayName("사용자 상세 조회")
    void getUserDetail() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users/" + pendingUserId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("pending@coffee.com"))
                .andExpect(jsonPath("$.data.name").value("Pending User"))
                .andExpect(jsonPath("$.data.accountStatus").value("PENDING_APPROVAL"));
    }

    @Test
    @DisplayName("사용자 승인 - STORE_MANAGER 역할 + 매장 배정")
    void approveUserAsStoreManager() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("role", "STORE_MANAGER",
                        "brandId", brandId,
                        "storeIds", List.of(storeId1, storeId2)));

        mockMvc.perform(put("/api/v1/admin/users/" + pendingUserId + "/approve")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accountStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.data.role").value("STORE_MANAGER"))
                .andExpect(jsonPath("$.data.brandId").value(brandId))
                .andExpect(jsonPath("$.data.stores").isArray())
                .andExpect(jsonPath("$.data.stores", hasSize(2)));
    }

    @Test
    @DisplayName("사용자 승인 - BRAND_ADMIN 역할")
    void approveUserAsBrandAdmin() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("role", "BRAND_ADMIN", "brandId", brandId));

        mockMvc.perform(put("/api/v1/admin/users/" + pendingUserId + "/approve")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.data.role").value("BRAND_ADMIN"));
    }

    @Test
    @DisplayName("사용자 거절")
    void rejectUser() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("reason", "가입 사유 불명확"));

        mockMvc.perform(put("/api/v1/admin/users/" + pendingUserId + "/reject")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountStatus").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectedReason").value("가입 사유 불명확"));
    }

    @Test
    @DisplayName("BRAND_ADMIN이 SUPER_ADMIN 역할 부여 시도 - 실패")
    void brandAdminCannotAssignSuperAdmin() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("role", "SUPER_ADMIN"));

        mockMvc.perform(put("/api/v1/admin/users/" + pendingUserId + "/approve")
                        .header("Authorization", "Bearer " + brandAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_PERMISSION"));
    }

    @Test
    @DisplayName("STORE_MANAGER는 사용자 관리 불가")
    void storeManagerCannotAccessAdminUsers() throws Exception {
        User storeManager = User.builder()
                .email("manager@coffee.com")
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .role(Role.STORE_MANAGER)
                .isActive(true)
                .accountStatus(AccountStatus.ACTIVE)
                .brandId(brandId)
                .storeId(storeId1)
                .build();
        storeManager = userRepository.save(storeManager);
        String storeManagerToken = jwtUtil.generateAccessToken(
                storeManager.getId(), storeManager.getEmail(), "STORE_MANAGER", 1L, brandId, storeId1);

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + storeManagerToken))
                .andExpect(status().isForbidden());
    }
}
