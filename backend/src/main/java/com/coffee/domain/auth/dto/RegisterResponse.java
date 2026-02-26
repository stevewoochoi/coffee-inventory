package com.coffee.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RegisterResponse {

    private Long userId;
    private String email;
    private String name;
    private String accountStatus;
}
