package com.coffee.domain.auth;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.util.JwtUtil;
import com.coffee.domain.auth.dto.LoginRequest;
import com.coffee.domain.auth.dto.LoginResponse;
import com.coffee.domain.auth.dto.TokenRefreshResponse;
import com.coffee.domain.org.entity.User;
import com.coffee.domain.org.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailAndIsActiveTrue(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name(),
                user.getCompanyId(), user.getBrandId(), user.getStoreId());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .userId(user.getId())
                .email(user.getEmail())
                .build();
    }

    public TokenRefreshResponse refresh(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new BusinessException("Invalid or expired refresh token", HttpStatus.UNAUTHORIZED, "TOKEN_INVALID");
        }

        String tokenType = jwtUtil.getTokenType(refreshToken);
        if (!"REFRESH".equals(tokenType)) {
            throw new BusinessException("Token is not a refresh token", HttpStatus.UNAUTHORIZED, "TOKEN_TYPE_MISMATCH");
        }

        Long userId = jwtUtil.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .orElseThrow(() -> new BusinessException("User not found or inactive", HttpStatus.UNAUTHORIZED, "USER_INACTIVE"));

        String newAccessToken = jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name(),
                user.getCompanyId(), user.getBrandId(), user.getStoreId());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }
}
