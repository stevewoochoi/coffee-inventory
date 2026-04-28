package com.coffee.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String role;
    private Long userId;
    private String email;
    private Long brandId;
    private Long storeId;
    private Long companyId;
}
