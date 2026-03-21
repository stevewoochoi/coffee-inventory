package com.coffee.security;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.org.entity.AccountStatus;
import com.coffee.domain.org.entity.Role;
import com.coffee.domain.org.entity.User;
import com.coffee.domain.org.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;

    private User adminUser;
    private User storeUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        adminUser = userRepository.save(User.builder()
                .email("admin@coffee.com")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .role(Role.SUPER_ADMIN)
                .companyId(1L)
                .brandId(1L)
                .isActive(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build());

        storeUser = userRepository.save(User.builder()
                .email("store@coffee.com")
                .passwordHash(passwordEncoder.encode("Store123!"))
                .role(Role.STORE_MANAGER)
                .companyId(1L)
                .brandId(1L)
                .storeId(1L)
                .isActive(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build());
    }

    private String adminAccessToken() {
        return jwtUtil.generateAccessToken(adminUser.getId(), adminUser.getEmail(),
                adminUser.getRole().name(), adminUser.getCompanyId(),
                adminUser.getBrandId(), adminUser.getStoreId());
    }

    private String storeAccessToken() {
        return jwtUtil.generateAccessToken(storeUser.getId(), storeUser.getEmail(),
                storeUser.getRole().name(), storeUser.getCompanyId(),
                storeUser.getBrandId(), storeUser.getStoreId());
    }

    // ===== 1. BCrypt DoS 방지 테스트 =====

    @Nested
    @DisplayName("BCrypt DoS 방지")
    class BcryptDosProtection {

        @Test
        @DisplayName("로그인 시 72자 초과 비밀번호 거부")
        void loginRejectsExcessivelyLongPassword() throws Exception {
            String longPassword = "A".repeat(10000);
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "admin@coffee.com", "password", longPassword));

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("회원가입 시 72자 초과 비밀번호 거부")
        void registerRejectsExcessivelyLongPassword() throws Exception {
            String longPassword = "A1!".repeat(100); // 300 chars
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "new@test.com",
                            "password", longPassword,
                            "passwordConfirm", longPassword,
                            "name", "Test"));

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    // ===== 2. JWT 보안 테스트 =====

    @Nested
    @DisplayName("JWT 보안")
    class JwtSecurity {

        @Test
        @DisplayName("빈 Bearer 토큰으로 보호된 엔드포인트 접근 거부")
        void emptyBearerTokenDenied() throws Exception {
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer "))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Bearer 접두사 없는 토큰 거부")
        void tokenWithoutBearerPrefixDenied() throws Exception {
            String token = adminAccessToken();
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", token))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Refresh 토큰으로 API 접근 불가")
        void refreshTokenCannotAccessApi() throws Exception {
            String refreshToken = jwtUtil.generateRefreshToken(adminUser.getId(), adminUser.getEmail());
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + refreshToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("조작된 JWT 페이로드 거부")
        void tamperedJwtPayloadRejected() throws Exception {
            String token = adminAccessToken();
            // JWT는 header.payload.signature 형식 — payload를 변경
            String[] parts = token.split("\\.");
            // payload의 한 문자를 변경
            String tamperedPayload = parts[1].substring(0, parts[1].length() - 1) + "X";
            String tamperedToken = parts[0] + "." + tamperedPayload + "." + parts[2];

            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + tamperedToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("완전히 무작위 문자열 토큰 거부")
        void randomStringTokenRejected() throws Exception {
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer totally-not-a-jwt-token"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("비활성 사용자의 Refresh 토큰 갱신 거부")
        void refreshTokenForInactiveUserRejected() throws Exception {
            String refreshToken = jwtUtil.generateRefreshToken(storeUser.getId(), storeUser.getEmail());

            // 사용자를 비활성화
            storeUser.setIsActive(false);
            userRepository.save(storeUser);

            String body = objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken));

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("정지된 사용자의 Refresh 토큰 갱신 거부")
        void refreshTokenForSuspendedUserRejected() throws Exception {
            String refreshToken = jwtUtil.generateRefreshToken(storeUser.getId(), storeUser.getEmail());

            storeUser.setAccountStatus(AccountStatus.SUSPENDED);
            userRepository.save(storeUser);

            String body = objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken));

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"));
        }
    }

    // ===== 3. SQL Injection 방지 테스트 =====

    @Nested
    @DisplayName("SQL Injection 방지")
    class SqlInjectionPrevention {

        @Test
        @DisplayName("로그인 이메일에 SQL Injection 시도")
        void loginSqlInjectionInEmail() throws Exception {
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "admin@coffee.com' OR '1'='1", "password", "anything"));

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("이메일 체크에 SQL Injection 시도")
        void checkEmailSqlInjection() throws Exception {
            mockMvc.perform(get("/api/v1/auth/check-email")
                            .param("email", "' OR 1=1 --"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.available").value(true));
        }

        @Test
        @DisplayName("회원가입 이름에 SQL Injection 시도")
        void registerSqlInjectionInName() throws Exception {
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "sqli@test.com",
                            "password", "Pass1234!",
                            "passwordConfirm", "Pass1234!",
                            "name", "'; DROP TABLE users; --"));

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());

            // users 테이블이 여전히 존재하는지 확인
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("email", "admin@coffee.com", "password", "Admin123!"))))
                    .andExpect(status().isOk());
        }
    }

    // ===== 4. XSS 방지 테스트 =====

    @Nested
    @DisplayName("XSS 방지")
    class XssPrevention {

        @Test
        @DisplayName("회원가입 이름에 XSS 스크립트 입력 — 스크립트가 실행되지 않고 저장만 됨")
        void registerWithXssInName() throws Exception {
            String xssName = "<script>alert('xss')</script>";
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "xss@test.com",
                            "password", "Pass1234!",
                            "passwordConfirm", "Pass1234!",
                            "name", xssName));

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    // 응답에 스크립트가 이스케이프되어 반환되는지 확인 (JSON이므로 자동 이스케이프됨)
                    .andExpect(jsonPath("$.data.name").value(xssName));
        }

        @Test
        @DisplayName("로그인 이메일에 XSS 시도 — 유효하지 않은 이메일로 거부")
        void loginWithXssInEmail() throws Exception {
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "<script>alert(1)</script>@test.com", "password", "Pass1234!"));

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().is4xxClientError());
        }
    }

    // ===== 5. 권한 상승 방지 테스트 =====

    @Nested
    @DisplayName("권한 상승 방지")
    class PrivilegeEscalation {

        @Test
        @DisplayName("STORE_MANAGER가 SUPER_ADMIN 전용 API 접근 거부")
        void storeManagerCannotAccessSuperAdminApi() throws Exception {
            mockMvc.perform(get("/api/v1/org/companies")
                            .header("Authorization", "Bearer " + storeAccessToken()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("STORE_MANAGER가 브랜드 생성 거부")
        void storeManagerCannotCreateBrand() throws Exception {
            String body = objectMapper.writeValueAsString(
                    Map.of("name", "Hacked Brand", "companyId", 1));

            mockMvc.perform(post("/api/v1/org/brands")
                            .header("Authorization", "Bearer " + storeAccessToken())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("인증 없이 관리자 API 접근 거부")
        void unauthenticatedCannotAccessAdminApi() throws Exception {
            mockMvc.perform(get("/api/v1/org/companies"))
                    .andExpect(status().isForbidden());
        }
    }

    // ===== 6. 입력 검증 테스트 =====

    @Nested
    @DisplayName("입력 검증")
    class InputValidation {

        @Test
        @DisplayName("로그인 시 빈 JSON body 거부")
        void loginEmptyBodyRejected() throws Exception {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("로그인 시 잘못된 이메일 형식 거부")
        void loginInvalidEmailFormatRejected() throws Exception {
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "not-an-email", "password", "Pass1234!"));

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("회원가입 시 이름 100자 초과 거부")
        void registerNameTooLongRejected() throws Exception {
            String longName = "A".repeat(101);
            String body = objectMapper.writeValueAsString(
                    Map.of("email", "long@test.com",
                            "password", "Pass1234!",
                            "passwordConfirm", "Pass1234!",
                            "name", longName));

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("회원가입 시 Content-Type 누락 시 성공하지 않음")
        void registerWithoutContentTypeRejected() throws Exception {
            mockMvc.perform(post("/api/v1/auth/register")
                            .content("{\"email\":\"test@test.com\"}"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assert status >= 400 : "Expected error status but got " + status;
                    });
        }

        @Test
        @DisplayName("Refresh 시 빈 토큰 거부")
        void refreshEmptyTokenRejected() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of("refreshToken", ""));

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().is4xxClientError());
        }
    }

    // ===== 7. 에러 응답 정보 유출 방지 테스트 =====

    @Nested
    @DisplayName("에러 응답 정보 유출 방지")
    class ErrorResponseLeakPrevention {

        @Test
        @DisplayName("로그인 실패 시 사용자 존재 여부를 구분할 수 없는 동일 메시지")
        void loginErrorMessageDoesNotRevealUserExistence() throws Exception {
            // 존재하지 않는 이메일
            String body1 = objectMapper.writeValueAsString(
                    Map.of("email", "nonexistent@coffee.com", "password", "Pass1234!"));
            String response1 = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body1))
                    .andExpect(status().isUnauthorized())
                    .andReturn().getResponse().getContentAsString();

            // 존재하는 이메일 + 잘못된 비밀번호
            String body2 = objectMapper.writeValueAsString(
                    Map.of("email", "admin@coffee.com", "password", "WrongPass1!"));
            String response2 = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body2))
                    .andExpect(status().isUnauthorized())
                    .andReturn().getResponse().getContentAsString();

            // 두 에러 응답의 code가 동일해야 함 (사용자 열거 방지)
            var resp1 = objectMapper.readTree(response1);
            var resp2 = objectMapper.readTree(response2);
            assert resp1.get("code").asText().equals(resp2.get("code").asText());
        }

        @Test
        @DisplayName("내부 서버 에러 시 스택트레이스 미노출")
        void internalErrorDoesNotLeakStackTrace() throws Exception {
            // 잘못된 JSON으로 에러 유도
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{ invalid json }"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assert status >= 400 : "Expected error status but got " + status;
                        String body = result.getResponse().getContentAsString();
                        // 스택트레이스가 노출되지 않아야 함
                        assert !body.contains("java.lang.") : "Stack trace leaked in response";
                        assert !body.contains("at com.coffee.") : "Internal class names leaked in response";
                    });
        }
    }

    // ===== 8. Header Injection 방지 테스트 =====

    @Nested
    @DisplayName("Header Injection 방지")
    class HeaderInjection {

        @Test
        @DisplayName("Bulk Template 다운로드 시 type 파라미터에 CRLF 주입 차단")
        void bulkTemplateTypeParamCrlfInjection() throws Exception {
            String token = adminAccessToken();

            // CRLF가 포함된 type 파라미터
            mockMvc.perform(get("/api/v1/admin/bulk/template")
                            .param("type", "item\r\nX-Injected: header")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(result -> {
                        String disposition = result.getResponse().getHeader("Content-Disposition");
                        // CRLF가 응답 헤더에 포함되지 않아야 함
                        assert disposition == null || !disposition.contains("\r\n");
                    });
        }
    }
}
