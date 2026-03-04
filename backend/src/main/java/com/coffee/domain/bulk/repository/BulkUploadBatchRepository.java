package com.coffee.domain.bulk.repository;

import com.coffee.domain.bulk.entity.BulkUploadBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BulkUploadBatchRepository extends JpaRepository<BulkUploadBatch, Long> {
    List<BulkUploadBatch> findAllByOrderByCreatedAtDesc();
}
