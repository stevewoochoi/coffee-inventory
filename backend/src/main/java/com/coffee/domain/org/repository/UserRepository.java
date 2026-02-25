package com.coffee.domain.org.repository;

import com.coffee.domain.org.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndIsActiveTrue(String email);

    boolean existsByEmail(String email);
}
