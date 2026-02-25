package com.coffee.domain.org.repository;

import com.coffee.domain.org.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {
}
