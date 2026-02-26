package com.coffee.domain.org.repository;

import com.coffee.domain.org.entity.UserStore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserStoreRepository extends JpaRepository<UserStore, Long> {

    List<UserStore> findByUserId(Long userId);

    List<UserStore> findByStoreId(Long storeId);

    void deleteByUserId(Long userId);
}
