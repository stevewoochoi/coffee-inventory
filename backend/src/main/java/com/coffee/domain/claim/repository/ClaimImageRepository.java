package com.coffee.domain.claim.repository;

import com.coffee.domain.claim.entity.ClaimImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimImageRepository extends JpaRepository<ClaimImage, Long> {

    List<ClaimImage> findByClaimId(Long claimId);
}
