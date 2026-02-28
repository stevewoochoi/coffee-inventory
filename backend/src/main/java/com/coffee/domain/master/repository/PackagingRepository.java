package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.PackagingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PackagingRepository extends JpaRepository<Packaging, Long> {

    List<Packaging> findByItemId(Long itemId);

    List<Packaging> findByItemIdAndStatus(Long itemId, PackagingStatus status);

    Optional<Packaging> findByIdAndStatus(Long id, PackagingStatus status);

    List<Packaging> findByStatus(PackagingStatus status);

    List<Packaging> findByItemIdInAndStatus(List<Long> itemIds, PackagingStatus status);

    @Query("SELECT p FROM Packaging p WHERE p.itemId IN (SELECT i.id FROM Item i WHERE i.brandId = :brandId)")
    List<Packaging> findAllByBrandId(@Param("brandId") Long brandId);

    @Query("SELECT p FROM Packaging p WHERE p.itemId IN (SELECT i.id FROM Item i WHERE i.brandId = :brandId) AND p.status = :status")
    List<Packaging> findAllByBrandIdAndStatus(@Param("brandId") Long brandId, @Param("status") PackagingStatus status);
}
