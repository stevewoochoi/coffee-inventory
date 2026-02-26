package com.coffee.domain.org.repository;

import com.coffee.domain.org.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndIsActiveTrue(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
            "(:status IS NULL OR CAST(u.accountStatus AS string) = :status) AND " +
            "(:role IS NULL OR CAST(u.role AS string) = :role) AND " +
            "(:search IS NULL OR u.email LIKE %:search% OR u.name LIKE %:search%) AND " +
            "(:brandId IS NULL OR u.brandId = :brandId)")
    Page<User> findByFilters(@Param("status") String status,
                              @Param("role") String role,
                              @Param("search") String search,
                              @Param("brandId") Long brandId,
                              Pageable pageable);
}
