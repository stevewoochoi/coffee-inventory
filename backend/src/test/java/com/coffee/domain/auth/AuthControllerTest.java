package com.coffee.domain.auth;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.org.entity.AccountStatus;
import com.coffee.domain.org.entity.Role;
import com.coffee.domain.org.entity.User;
import com.coffee.domain.org.repository.UserRepository;
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

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        User user = User.builder()
                .email("admin@coffee.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.SUPER_ADMIN)
                .companyId(1L)
                .isActive(true)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        userRepository.save(user);
    }

    @Test
    @DisplayName("로그인 성공 - 올바른 이메일/비밀번호")
    void loginSuccess() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", "admin@coffee.com", "password", "password123"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.data.email").value("admin@coffee.com"));
    }

    @Test
    @DisplayName("로그인 실패 - 잘못된 비밀번호")
    void loginFailWrongPassword() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", "admin@coffee.com", "password", "wrongpass"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("AUTH_FAILED"));
    }

    @Test
    @DisplayName("로그인 실패 - 존재하지 않는 이메일")
    void loginFailUserNotFound() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", "noone@coffee.com", "password", "password123"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("로그인 실패 - 비활성화된 사용자")
    void loginFailInactiveUser() throws Exception {
        User inactive = User.builder()
                .email("inactive@coffee.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.STORE_MANAGER)
                .isActive(false)
                .build();
        userRepository.save(inactive);

        String body = objectMapper.writeValueAsString(
                Map.of("email", "inactive@coffee.com", "password", "password123"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("토큰 갱신 성공")
    void refreshTokenSuccess() throws Exception {
        User user = userRepository.findByEmailAndIsActiveTrue("admin@coffee.com").orElseThrow();
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());

        String body = objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    @DisplayName("토큰 갱신 실패 - Access Token으로 갱신 시도")
    void refreshWithAccessTokenFails() throws Exception {
        User user = userRepository.findByEmailAndIsActiveTrue("admin@coffee.com").orElseThrow();
        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name(),
                user.getCompanyId(), user.getBrandId(), user.getStoreId());

        String body = objectMapper.writeValueAsString(Map.of("refreshToken", accessToken));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("TOKEN_TYPE_MISMATCH"));
    }

    @Test
    @DisplayName("토큰 갱신 실패 - 유효하지 않은 토큰")
    void refreshWithInvalidTokenFails() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("refreshToken", "invalid.token.here"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("인증 필요한 엔드포인트 - 토큰 없이 접근 시 401")
    void protectedEndpointWithoutToken() throws Exception {
        mockMvc.perform(post("/api/v1/some/protected")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    // ===== 회원가입 테스트 =====

    @Test
    @DisplayName("회원가입 성공")
    void registerSuccess() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", "new@coffee.com",
                        "password", "Pass1234!",
                        "passwordConfirm", "Pass1234!",
                        "name", "New User"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("new@coffee.com"))
                .andExpect(jsonPath("$.data.name").value("New User"))
                .andExpect(jsonPath("$.data.accountStatus").value("PENDING_APPROVAL"));
    }

    @Test
    @DisplayName("회원가입 실패 - 이메일 중복")
    void registerFailDuplicateEmail() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", "admin@coffee.com",
                        "password", "Pass1234!",
                        "passwordConfirm", "Pass1234!",
                        "name", "Duplicate"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("EMAIL_DUPLICATE"));
    }

    @Test
    @DisplayName("회원가입 실패 - 비밀번호 불일치")
    void registerFailPasswordMismatch() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", "new2@coffee.com",
                        "password", "Pass1234!",
                        "passwordConfirm", "Different1!",
                        "name", "User"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("PASSWORD_MISMATCH"));
    }

    @Test
    @DisplayName("회원가입 실패 - 비밀번호 규칙 위반 (특수문자 없음)")
    void registerFailWeakPassword() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", "new3@coffee.com",
                        "password", "password123",
                        "passwordConfirm", "password123",
                        "name", "User"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("이메일 중복 체크 - 사용 가능")
    void checkEmailAvailable() throws Exception {
        mockMvc.perform(get("/api/v1/auth/check-email")
                        .param("email", "available@coffee.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true));
    }

    @Test
    @DisplayName("이메일 중복 체크 - 사용 불가")
    void checkEmailNotAvailable() throws Exception {
        mockMvc.perform(get("/api/v1/auth/check-email")
                        .param("email", "admin@coffee.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false));
    }

    // ===== 로그인 시 account_status 체크 =====

    @Test
    @DisplayName("로그인 실패 - 승인 대기 중인 사용자")
    void loginFailPendingApproval() throws Exception {
        User pending = User.builder()
                .email("pending@coffee.com")
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .role(Role.STORE_MANAGER)
                .isActive(true)
                .accountStatus(AccountStatus.PENDING_APPROVAL)
                .build();
        userRepository.save(pending);

        String body = objectMapper.writeValueAsString(
                Map.of("email", "pending@coffee.com", "password", "Pass1234!"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("ACCOUNT_PENDING"));
    }

    @Test
    @DisplayName("로그인 실패 - 거절된 사용자")
    void loginFailRejected() throws Exception {
        User rejected = User.builder()
                .email("rejected@coffee.com")
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .role(Role.STORE_MANAGER)
                .isActive(true)
                .accountStatus(AccountStatus.REJECTED)
                .build();
        userRepository.save(rejected);

        String body = objectMapper.writeValueAsString(
                Map.of("email", "rejected@coffee.com", "password", "Pass1234!"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("ACCOUNT_REJECTED"));
    }

    @Test
    @DisplayName("로그인 실패 - 정지된 사용자")
    void loginFailSuspended() throws Exception {
        User suspended = User.builder()
                .email("suspended@coffee.com")
                .passwordHash(passwordEncoder.encode("Pass1234!"))
                .role(Role.STORE_MANAGER)
                .isActive(true)
                .accountStatus(AccountStatus.SUSPENDED)
                .build();
        userRepository.save(suspended);

        String body = objectMapper.writeValueAsString(
                Map.of("email", "suspended@coffee.com", "password", "Pass1234!"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));
    }
}
