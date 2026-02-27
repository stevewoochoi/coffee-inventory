package com.coffee.domain.claim.repository;

import com.coffee.domain.claim.entity.ClaimLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimLineRepository extends JpaRepository<ClaimLine, Long> {

    List<ClaimLine> findByClaimId(Long claimId);
}
