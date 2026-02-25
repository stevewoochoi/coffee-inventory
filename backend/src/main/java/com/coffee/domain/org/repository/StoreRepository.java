package com.coffee.domain.org.repository;

import com.coffee.domain.org.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreRepository extends JpaRepository<Store, Long> {

    List<Store> findByBrandId(Long brandId);
}
