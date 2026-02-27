package com.coffee.domain.claim.repository;

import com.coffee.domain.claim.entity.Claim;
import com.coffee.domain.claim.entity.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ClaimRepository extends JpaRepository<Claim, Long> {

    List<Claim> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    List<Claim> findByStoreIdAndStatusOrderByCreatedAtDesc(Long storeId, ClaimStatus status);

    List<Claim> findByStoreIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long storeId, LocalDateTime from, LocalDateTime to);

    long countByStoreIdAndStatus(Long storeId, ClaimStatus status);
}
