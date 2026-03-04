package com.coffee.domain.master.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.master.dto.ItemDeliveryScheduleDto;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.ItemDeliverySchedule;
import com.coffee.domain.master.repository.ItemDeliveryScheduleRepository;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/master/items/{itemId}/delivery-schedule")
@RequiredArgsConstructor
public class ItemDeliveryScheduleController {

    private final ItemDeliveryScheduleRepository scheduleRepository;
    private final ItemRepository itemRepository;

    @GetMapping
    public ApiResponse<ItemDeliveryScheduleDto.Response> get(@PathVariable Long itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item", itemId));

        return scheduleRepository.findByItemIdAndBrandId(itemId, item.getBrandId())
                .map(this::toResponse)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.ok(null));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
    public ApiResponse<ItemDeliveryScheduleDto.Response> create(
            @PathVariable Long itemId,
            @RequestBody ItemDeliveryScheduleDto.Request request) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item", itemId));

        ItemDeliverySchedule schedule = ItemDeliverySchedule.builder()
                .itemId(itemId)
                .brandId(item.getBrandId())
                .mon(request.getMon() != null ? request.getMon() : false)
                .tue(request.getTue() != null ? request.getTue() : false)
                .wed(request.getWed() != null ? request.getWed() : false)
                .thu(request.getThu() != null ? request.getThu() : false)
                .fri(request.getFri() != null ? request.getFri() : false)
                .sat(request.getSat() != null ? request.getSat() : false)
                .sun(request.getSun() != null ? request.getSun() : false)
                .build();
        scheduleRepository.save(schedule);
        return ApiResponse.ok(toResponse(schedule));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
    public ApiResponse<ItemDeliveryScheduleDto.Response> update(
            @PathVariable Long itemId,
            @RequestBody ItemDeliveryScheduleDto.Request request) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item", itemId));

        ItemDeliverySchedule schedule = scheduleRepository.findByItemIdAndBrandId(itemId, item.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("ItemDeliverySchedule for item", itemId));

        if (request.getMon() != null) schedule.setMon(request.getMon());
        if (request.getTue() != null) schedule.setTue(request.getTue());
        if (request.getWed() != null) schedule.setWed(request.getWed());
        if (request.getThu() != null) schedule.setThu(request.getThu());
        if (request.getFri() != null) schedule.setFri(request.getFri());
        if (request.getSat() != null) schedule.setSat(request.getSat());
        if (request.getSun() != null) schedule.setSun(request.getSun());
        scheduleRepository.save(schedule);
        return ApiResponse.ok(toResponse(schedule));
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BRAND_ADMIN','KR_INVENTORY')")
    public ApiResponse<Void> delete(@PathVariable Long itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item", itemId));

        scheduleRepository.findByItemIdAndBrandId(itemId, item.getBrandId())
                .ifPresent(s -> {
                    s.setIsActive(false);
                    scheduleRepository.save(s);
                });
        return ApiResponse.ok(null);
    }

    private ItemDeliveryScheduleDto.Response toResponse(ItemDeliverySchedule s) {
        return ItemDeliveryScheduleDto.Response.builder()
                .id(s.getId())
                .itemId(s.getItemId())
                .brandId(s.getBrandId())
                .mon(s.getMon())
                .tue(s.getTue())
                .wed(s.getWed())
                .thu(s.getThu())
                .fri(s.getFri())
                .sat(s.getSat())
                .sun(s.getSun())
                .isActive(s.getIsActive())
                .displayDays(s.getDisplayDays())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
