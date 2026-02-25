package com.coffee.domain.auth;

import com.coffee.common.util.JwtUtil;
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
}
