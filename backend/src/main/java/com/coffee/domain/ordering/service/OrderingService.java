package com.coffee.domain.ordering.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.ordering.dto.OrderPlanDto;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.OrderDispatchLogRepository;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderingService {

    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final OrderDispatchLogRepository dispatchLogRepository;

    public List<OrderPlanDto.Response> findByStoreId(Long storeId) {
        return planRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::toResponse)
                .toList();
    }

    public OrderPlanDto.Response findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public OrderPlanDto.Response create(OrderPlanDto.CreateRequest request) {
        OrderPlan plan = OrderPlan.builder()
                .storeId(request.getStoreId())
                .supplierId(request.getSupplierId())
                .build();
        planRepository.save(plan);

        if (request.getLines() != null) {
            for (OrderPlanDto.OrderLineDto line : request.getLines()) {
                lineRepository.save(OrderLine.builder()
                        .orderPlanId(plan.getId())
                        .packagingId(line.getPackagingId())
                        .packQty(line.getPackQty())
                        .build());
            }
        }

        return toResponse(plan);
    }

    @Transactional
    public OrderPlanDto.Response confirm(Long id) {
        OrderPlan plan = getOrThrow(id);
        if (plan.getStatus() != OrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT orders can be confirmed", HttpStatus.BAD_REQUEST);
        }
        plan.setStatus(OrderStatus.CONFIRMED);
        return toResponse(planRepository.save(plan));
    }

    @Transactional
    public OrderPlanDto.Response dispatch(Long id) {
        OrderPlan plan = getOrThrow(id);
        if (plan.getStatus() != OrderStatus.CONFIRMED) {
            throw new BusinessException("Only CONFIRMED orders can be dispatched", HttpStatus.BAD_REQUEST);
        }

        // 실제 이메일 발송은 SES 연동 시 구현, 여기서는 로그만 기록
        dispatchLogRepository.save(OrderDispatchLog.builder()
                .orderPlanId(id)
                .method(DispatchMethod.EMAIL)
                .status(DispatchStatus.SUCCESS)
                .responseBody("Order dispatched (stub)")
                .build());

        plan.setStatus(OrderStatus.DISPATCHED);
        return toResponse(planRepository.save(plan));
    }

    private OrderPlan getOrThrow(Long id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", id));
    }

    private OrderPlanDto.Response toResponse(OrderPlan p) {
        return OrderPlanDto.Response.builder()
                .id(p.getId())
                .storeId(p.getStoreId())
                .supplierId(p.getSupplierId())
                .status(p.getStatus().name())
                .recommendedByAi(p.getRecommendedByAi())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
