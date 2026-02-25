package com.coffee.common.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private JwtUtil expiredJwtUtil;

    private static final String SECRET = "test-jwt-secret-key-minimum-32-characters-long-for-hmac";

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET, 3600000L, 604800000L);
        // 만료 시간 0ms로 설정하여 즉시 만료되는 토큰 생성용
        expiredJwtUtil = new JwtUtil(SECRET, 0L, 0L);
    }

    @Test
    @DisplayName("Access Token 생성 및 파싱 성공")
    void generateAndParseAccessToken() {
        String token = jwtUtil.generateAccessToken(1L, "admin@test.com", "SUPER_ADMIN", 1L, null, null);

        assertThat(jwtUtil.validateToken(token)).isTrue();
        assertThat(jwtUtil.getUserId(token)).isEqualTo(1L);
        assertThat(jwtUtil.getEmail(token)).isEqualTo("admin@test.com");
        assertThat(jwtUtil.getRole(token)).isEqualTo("SUPER_ADMIN");
        assertThat(jwtUtil.getTokenType(token)).isEqualTo("ACCESS");
        assertThat(jwtUtil.getCompanyId(token)).isEqualTo(1L);
        assertThat(jwtUtil.getBrandId(token)).isNull();
        assertThat(jwtUtil.getStoreId(token)).isNull();
    }

    @Test
    @DisplayName("Refresh Token 생성 및 파싱 성공")
    void generateAndParseRefreshToken() {
        String token = jwtUtil.generateRefreshToken(1L, "admin@test.com");

        assertThat(jwtUtil.validateToken(token)).isTrue();
        assertThat(jwtUtil.getUserId(token)).isEqualTo(1L);
        assertThat(jwtUtil.getEmail(token)).isEqualTo("admin@test.com");
        assertThat(jwtUtil.getTokenType(token)).isEqualTo("REFRESH");
        assertThat(jwtUtil.getRole(token)).isNull();
    }

    @Test
    @DisplayName("STORE_MANAGER 토큰에 store_id 포함")
    void storeManagerTokenContainsStoreId() {
        String token = jwtUtil.generateAccessToken(3L, "store@test.com", "STORE_MANAGER", 1L, 2L, 10L);

        assertThat(jwtUtil.getCompanyId(token)).isEqualTo(1L);
        assertThat(jwtUtil.getBrandId(token)).isEqualTo(2L);
        assertThat(jwtUtil.getStoreId(token)).isEqualTo(10L);
    }

    @Test
    @DisplayName("만료된 토큰 검증 실패")
    void expiredTokenValidationFails() {
        String token = expiredJwtUtil.generateAccessToken(1L, "admin@test.com", "SUPER_ADMIN", null, null, null);

        assertThat(jwtUtil.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰 파싱 시 ExpiredJwtException")
    void expiredTokenThrowsException() {
        String token = expiredJwtUtil.generateAccessToken(1L, "admin@test.com", "SUPER_ADMIN", null, null, null);

        assertThatThrownBy(() -> jwtUtil.parseToken(token))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    @DisplayName("변조된 토큰 검증 실패")
    void tamperedTokenValidationFails() {
        String token = jwtUtil.generateAccessToken(1L, "admin@test.com", "SUPER_ADMIN", null, null, null);
        String tamperedToken = token + "tampered";

        assertThat(jwtUtil.validateToken(tamperedToken)).isFalse();
    }

    @Test
    @DisplayName("잘못된 시크릿으로 서명된 토큰 검증 실패")
    void wrongSecretTokenValidationFails() {
        JwtUtil otherJwtUtil = new JwtUtil(
                "different-secret-key-minimum-32-characters-long-for-hmac",
                3600000L, 604800000L);
        String token = otherJwtUtil.generateAccessToken(1L, "admin@test.com", "SUPER_ADMIN", null, null, null);

        assertThat(jwtUtil.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("빈 문자열 토큰 검증 실패")
    void emptyTokenValidationFails() {
        assertThat(jwtUtil.validateToken("")).isFalse();
        assertThat(jwtUtil.validateToken(null)).isFalse();
    }
}
