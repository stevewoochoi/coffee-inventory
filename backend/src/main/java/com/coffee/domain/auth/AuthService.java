package com.coffee.domain.auth;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.util.JwtUtil;
import com.coffee.domain.auth.dto.*;
import com.coffee.domain.org.entity.AccountStatus;
import com.coffee.domain.org.entity.Role;
import com.coffee.domain.org.entity.User;
import com.coffee.domain.org.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // Check account_status
        if (user.getAccountStatus() != null && user.getAccountStatus() != AccountStatus.ACTIVE) {
            switch (user.getAccountStatus()) {
                case PENDING_APPROVAL:
                    throw new BusinessException("Account is pending approval", HttpStatus.FORBIDDEN, "ACCOUNT_PENDING");
                case REJECTED:
                    throw new BusinessException("Account registration was rejected", HttpStatus.FORBIDDEN, "ACCOUNT_REJECTED");
                case SUSPENDED:
                    throw new BusinessException("Account is suspended", HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED");
                default:
                    break;
            }
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

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        // Password confirmation check
        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new BusinessException("Passwords do not match", HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH");
        }

        // Email duplicate check
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email is already in use", HttpStatus.CONFLICT, "EMAIL_DUPLICATE");
        }

        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.STORE_MANAGER) // default role, will be changed on approval
                .accountStatus(AccountStatus.PENDING_APPROVAL)
                .isActive(true)
                .build();

        User saved = userRepository.save(user);

        return RegisterResponse.builder()
                .userId(saved.getId())
                .email(saved.getEmail())
                .name(saved.getName())
                .accountStatus(saved.getAccountStatus().name())
                .build();
    }

    public boolean checkEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
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

        // Also check account_status on refresh
        if (user.getAccountStatus() != null && user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException("Account is not active", HttpStatus.UNAUTHORIZED, "ACCOUNT_NOT_ACTIVE");
        }

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
