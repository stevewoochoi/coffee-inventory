package com.coffee.domain.org.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.org.dto.UserDto;
import com.coffee.domain.org.entity.*;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.org.repository.UserRepository;
import com.coffee.domain.org.repository.UserStoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserStoreRepository userStoreRepository;
    private final BrandRepository brandRepository;
    private final StoreRepository storeRepository;

    public UserDto.ListResponse getUsers(String status, String role, String search,
                                          int page, int size,
                                          Long currentUserId, Role currentRole, Long currentBrandId) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "registeredAt"));

        Page<User> userPage;

        if (currentRole == Role.BRAND_ADMIN && currentBrandId != null) {
            // BRAND_ADMIN can only see users in their brand
            userPage = userRepository.findByFilters(status, role, search, currentBrandId, pageRequest);
        } else {
            // SUPER_ADMIN can see all
            userPage = userRepository.findByFilters(status, role, search, null, pageRequest);
        }

        List<UserDto.Response> content = userPage.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return UserDto.ListResponse.builder()
                .content(content)
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .build();
    }

    public UserDto.Response getUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return toResponse(user);
    }

    @Transactional
    public UserDto.Response approveUser(Long userId, UserDto.ApproveRequest request,
                                         Long approverId, Role approverRole, Long approverBrandId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (user.getAccountStatus() != AccountStatus.PENDING_APPROVAL) {
            throw new BusinessException("User is not in pending approval status", HttpStatus.BAD_REQUEST, "INVALID_STATUS");
        }

        Role targetRole;
        try {
            targetRole = Role.valueOf(request.getRole());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid role: " + request.getRole(), HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }

        // Permission check
        validateRoleAssignment(approverRole, targetRole, approverBrandId, request.getBrandId());

        user.setRole(targetRole);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setApprovedBy(approverId);
        user.setApprovedAt(LocalDateTime.now());

        // Set brand/company for BRAND_ADMIN
        if (targetRole == Role.BRAND_ADMIN || targetRole == Role.STORE_MANAGER) {
            if (request.getBrandId() == null) {
                throw new BusinessException("Brand ID is required", HttpStatus.BAD_REQUEST, "BRAND_REQUIRED");
            }
            Brand brand = brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Brand", request.getBrandId()));
            user.setBrandId(brand.getId());
            user.setCompanyId(brand.getCompanyId());
        }

        // Create user_store mappings for STORE_MANAGER
        if (targetRole == Role.STORE_MANAGER) {
            if (request.getStoreIds() == null || request.getStoreIds().isEmpty()) {
                throw new BusinessException("Store IDs are required", HttpStatus.BAD_REQUEST, "STORE_REQUIRED");
            }

            // Set the first store as the main storeId on user
            user.setStoreId(request.getStoreIds().get(0));

            for (int i = 0; i < request.getStoreIds().size(); i++) {
                Long storeId = request.getStoreIds().get(i);
                Store store = storeRepository.findById(storeId)
                        .orElseThrow(() -> new ResourceNotFoundException("Store", storeId));
                // Validate store belongs to the brand
                if (!store.getBrandId().equals(request.getBrandId())) {
                    throw new BusinessException("Store does not belong to the selected brand: " + storeId,
                            HttpStatus.BAD_REQUEST, "STORE_BRAND_MISMATCH");
                }
                UserStore userStore = UserStore.builder()
                        .userId(userId)
                        .storeId(storeId)
                        .isPrimary(i == 0) // first store is primary
                        .build();
                userStoreRepository.save(userStore);
            }
        }

        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public UserDto.Response rejectUser(Long userId, UserDto.RejectRequest request, Long rejecterId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (user.getAccountStatus() != AccountStatus.PENDING_APPROVAL) {
            throw new BusinessException("User is not in pending approval status", HttpStatus.BAD_REQUEST, "INVALID_STATUS");
        }

        user.setAccountStatus(AccountStatus.REJECTED);
        user.setRejectedReason(request.getReason());
        userRepository.save(user);

        return toResponse(user);
    }

    private void validateRoleAssignment(Role approverRole, Role targetRole,
                                         Long approverBrandId, Long targetBrandId) {
        if (approverRole == Role.SUPER_ADMIN) {
            // SUPER_ADMIN can assign any role
            return;
        }

        if (approverRole == Role.BRAND_ADMIN) {
            // BRAND_ADMIN can assign BRAND_ADMIN or STORE_MANAGER within their brand
            if (targetRole == Role.SUPER_ADMIN) {
                throw new BusinessException("Brand admin cannot assign super admin role",
                        HttpStatus.FORBIDDEN, "INSUFFICIENT_PERMISSION");
            }
            if (targetBrandId != null && !targetBrandId.equals(approverBrandId)) {
                throw new BusinessException("Can only assign roles within your own brand",
                        HttpStatus.FORBIDDEN, "BRAND_MISMATCH");
            }
            return;
        }

        throw new BusinessException("Insufficient permission to assign roles", HttpStatus.FORBIDDEN, "INSUFFICIENT_PERMISSION");
    }

    private UserDto.Response toResponse(User user) {
        List<UserDto.UserStoreInfo> stores = null;
        if (user.getRole() == Role.STORE_MANAGER) {
            List<UserStore> userStores = userStoreRepository.findByUserId(user.getId());
            stores = userStores.stream()
                    .map(us -> {
                        String storeName = storeRepository.findById(us.getStoreId())
                                .map(Store::getName)
                                .orElse("Unknown");
                        return UserDto.UserStoreInfo.builder()
                                .storeId(us.getStoreId())
                                .storeName(storeName)
                                .isPrimary(us.getIsPrimary())
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        return UserDto.Response.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole().name())
                .companyId(user.getCompanyId())
                .brandId(user.getBrandId())
                .storeId(user.getStoreId())
                .accountStatus(user.getAccountStatus() != null ? user.getAccountStatus().name() : null)
                .isActive(user.getIsActive())
                .registeredAt(user.getRegisteredAt())
                .approvedAt(user.getApprovedAt())
                .approvedBy(user.getApprovedBy())
                .rejectedReason(user.getRejectedReason())
                .stores(stores)
                .build();
    }
}
