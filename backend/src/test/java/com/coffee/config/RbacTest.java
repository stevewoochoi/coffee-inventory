package com.coffee.config;

import com.coffee.common.util.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RbacTest {

    @TestConfiguration
    static class TestControllerConfig {
        @RestController
        @RequestMapping("/api/v1/test-rbac")
        static class TestRbacController {

            @GetMapping("/super-admin-only")
            @PreAuthorize("hasRole('SUPER_ADMIN')")
            public String superAdminOnly() {
                return "super-admin-ok";
            }

            @GetMapping("/brand-admin-up")
            @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
            public String brandAdminUp() {
                return "brand-admin-ok";
            }

            @GetMapping("/all-roles")
            @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'STORE_MANAGER')")
            public String allRoles() {
                return "all-ok";
            }

            @GetMapping("/authenticated")
            public String authenticated() {
                return "auth-ok";
            }
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    private String tokenFor(String role) {
        return jwtUtil.generateAccessToken(1L, "test@coffee.com", role, 1L, 1L, 1L);
    }

    // --- SUPER_ADMIN 접근 테스트 ---

    @Test
    @DisplayName("SUPER_ADMIN - super-admin-only 접근 성공")
    void superAdminCanAccessSuperAdminOnly() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/super-admin-only")
                        .header("Authorization", "Bearer " + tokenFor("SUPER_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(content().string("super-admin-ok"));
    }

    @Test
    @DisplayName("SUPER_ADMIN - brand-admin-up 접근 성공")
    void superAdminCanAccessBrandAdminUp() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/brand-admin-up")
                        .header("Authorization", "Bearer " + tokenFor("SUPER_ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SUPER_ADMIN - all-roles 접근 성공")
    void superAdminCanAccessAllRoles() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/all-roles")
                        .header("Authorization", "Bearer " + tokenFor("SUPER_ADMIN")))
                .andExpect(status().isOk());
    }

    // --- BRAND_ADMIN 접근 테스트 ---

    @Test
    @DisplayName("BRAND_ADMIN - super-admin-only 접근 거부")
    void brandAdminCannotAccessSuperAdminOnly() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/super-admin-only")
                        .header("Authorization", "Bearer " + tokenFor("BRAND_ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("BRAND_ADMIN - brand-admin-up 접근 성공")
    void brandAdminCanAccessBrandAdminUp() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/brand-admin-up")
                        .header("Authorization", "Bearer " + tokenFor("BRAND_ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("BRAND_ADMIN - all-roles 접근 성공")
    void brandAdminCanAccessAllRoles() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/all-roles")
                        .header("Authorization", "Bearer " + tokenFor("BRAND_ADMIN")))
                .andExpect(status().isOk());
    }

    // --- STORE_MANAGER 접근 테스트 ---

    @Test
    @DisplayName("STORE_MANAGER - super-admin-only 접근 거부")
    void storeManagerCannotAccessSuperAdminOnly() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/super-admin-only")
                        .header("Authorization", "Bearer " + tokenFor("STORE_MANAGER")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("STORE_MANAGER - brand-admin-up 접근 거부")
    void storeManagerCannotAccessBrandAdminUp() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/brand-admin-up")
                        .header("Authorization", "Bearer " + tokenFor("STORE_MANAGER")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("STORE_MANAGER - all-roles 접근 성공")
    void storeManagerCanAccessAllRoles() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/all-roles")
                        .header("Authorization", "Bearer " + tokenFor("STORE_MANAGER")))
                .andExpect(status().isOk());
    }

    // --- 미인증 접근 테스트 ---

    @Test
    @DisplayName("미인증 - 인증 필요 엔드포인트 접근 거부")
    void unauthenticatedCannotAccessProtected() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/authenticated"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("인증된 사용자 - 인증만 필요한 엔드포인트 접근 성공")
    void authenticatedCanAccessProtected() throws Exception {
        mockMvc.perform(get("/api/v1/test-rbac/authenticated")
                        .header("Authorization", "Bearer " + tokenFor("STORE_MANAGER")))
                .andExpect(status().isOk())
                .andExpect(content().string("auth-ok"));
    }
}
