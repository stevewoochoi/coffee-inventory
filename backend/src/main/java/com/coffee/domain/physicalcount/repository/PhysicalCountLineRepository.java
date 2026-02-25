package com.coffee.domain.physicalcount.repository;

import com.coffee.domain.physicalcount.entity.PhysicalCountLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PhysicalCountLineRepository extends JpaRepository<PhysicalCountLine, Long> {

    List<PhysicalCountLine> findByCountId(Long countId);

    Optional<PhysicalCountLine> findByCountIdAndId(Long countId, Long lineId);
}
