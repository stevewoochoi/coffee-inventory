package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.PackagingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PackagingRepository extends JpaRepository<Packaging, Long> {

    List<Packaging> findByItemIdAndStatus(Long itemId, PackagingStatus status);

    Optional<Packaging> findByIdAndStatus(Long id, PackagingStatus status);

    List<Packaging> findByStatus(PackagingStatus status);

    List<Packaging> findByItemIdInAndStatus(List<Long> itemIds, PackagingStatus status);
}
