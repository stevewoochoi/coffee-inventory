package com.coffee.config;

import com.coffee.domain.org.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String email;
    private final String password;
    private final String role;
    private final Long companyId;
    private final Long brandId;
    private final Long storeId;
    private final boolean active;

    public CustomUserDetails(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.role = user.getRole().name();
        this.companyId = user.getCompanyId();
        this.brandId = user.getBrandId();
        this.storeId = user.getStoreId();
        this.active = Boolean.TRUE.equals(user.getIsActive());
    }

    public CustomUserDetails(Long id, String email, String role,
                             Long companyId, Long brandId, Long storeId) {
        this.id = id;
        this.email = email;
        this.password = null;
        this.role = role;
        this.companyId = companyId;
        this.brandId = brandId;
        this.storeId = storeId;
        this.active = true;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    /** SUPER_ADMIN sees all brands; others scoped to their brandId. */
    public Long getEffectiveBrandId() {
        return "SUPER_ADMIN".equals(role) ? null : brandId;
    }

    public boolean isSuperAdmin() {
        return "SUPER_ADMIN".equals(role);
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
