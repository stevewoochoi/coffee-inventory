package com.coffee.domain.ordering.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderPdfService {

    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final SupplierRepository supplierRepository;
    private final StoreRepository storeRepository;
    private final PdfGeneratorService pdfGeneratorService;

    public byte[] generatePdfForPlan(Long planId) {
        OrderPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", planId));

        List<OrderLine> lines = lineRepository.findByOrderPlanIdAndIsActiveTrue(planId);
        if (lines == null) lines = List.of();

        Supplier supplier = supplierRepository.findById(plan.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", plan.getSupplierId()));

        Store store = storeRepository.findById(plan.getStoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Store", plan.getStoreId()));

        return pdfGeneratorService.generateOrderPdf(plan, lines, supplier, store);
    }
}
