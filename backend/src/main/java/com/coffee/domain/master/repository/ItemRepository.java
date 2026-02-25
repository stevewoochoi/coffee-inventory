package com.coffee.domain.master.repository;

import com.coffee.domain.master.entity.Item;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long> {

    Page<Item> findByBrandIdAndIsActiveTrue(Long brandId, Pageable pageable);

    Page<Item> findByIsActiveTrue(Pageable pageable);

    Optional<Item> findByIdAndIsActiveTrue(Long id);
}
