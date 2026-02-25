package com.coffee.domain.org.repository;

import com.coffee.domain.org.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BrandRepository extends JpaRepository<Brand, Long> {

    List<Brand> findByCompanyId(Long companyId);
}
