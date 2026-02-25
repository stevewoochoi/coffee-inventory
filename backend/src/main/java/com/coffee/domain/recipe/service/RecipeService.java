package com.coffee.domain.recipe.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.recipe.dto.MenuDto;
import com.coffee.domain.recipe.dto.RecipeComponentDto;
import com.coffee.domain.recipe.entity.Menu;
import com.coffee.domain.recipe.entity.RecipeComponent;
import com.coffee.domain.recipe.repository.MenuRepository;
import com.coffee.domain.recipe.repository.RecipeComponentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecipeService {

    private final MenuRepository menuRepository;
    private final RecipeComponentRepository componentRepository;

    public List<MenuDto.Response> findMenusByBrandId(Long brandId) {
        return menuRepository.findByBrandIdAndIsActiveTrue(brandId).stream()
                .map(this::toMenuResponse)
                .toList();
    }

    public MenuDto.Response findMenuById(Long id) {
        return toMenuResponse(getMenuOrThrow(id));
    }

    @Transactional
    public MenuDto.Response createMenu(MenuDto.Request request) {
        Menu menu = Menu.builder()
                .brandId(request.getBrandId())
                .name(request.getName())
                .posMenuId(request.getPosMenuId())
                .build();
        return toMenuResponse(menuRepository.save(menu));
    }

    @Transactional
    public MenuDto.Response updateMenu(Long id, MenuDto.Request request) {
        Menu menu = getMenuOrThrow(id);
        menu.setName(request.getName());
        if (request.getPosMenuId() != null) menu.setPosMenuId(request.getPosMenuId());
        return toMenuResponse(menuRepository.save(menu));
    }

    @Transactional
    public void deleteMenu(Long id) {
        Menu menu = getMenuOrThrow(id);
        menu.setIsActive(false);
        menuRepository.save(menu);
    }

    // Recipe Components
    public List<RecipeComponentDto.Response> findComponentsByMenuId(Long menuId) {
        return componentRepository.findByMenuId(menuId).stream()
                .map(this::toComponentResponse)
                .toList();
    }

    @Transactional
    public RecipeComponentDto.Response addComponent(Long menuId, RecipeComponentDto.Request request) {
        getMenuOrThrow(menuId);
        RecipeComponent component = RecipeComponent.builder()
                .menuId(menuId)
                .optionId(request.getOptionId())
                .itemId(request.getItemId())
                .qtyBaseUnit(request.getQtyBaseUnit())
                .build();
        return toComponentResponse(componentRepository.save(component));
    }

    @Transactional
    public void deleteComponent(Long componentId) {
        componentRepository.findById(componentId)
                .orElseThrow(() -> new ResourceNotFoundException("RecipeComponent", componentId));
        componentRepository.deleteById(componentId);
    }

    /**
     * 메뉴 1잔 판매 시 소모되는 부재료 수량 계산
     */
    public Map<Long, BigDecimal> calculateConsumption(Long menuId) {
        List<RecipeComponent> components = componentRepository.findByMenuIdAndOptionIdIsNull(menuId);
        return components.stream()
                .collect(Collectors.toMap(
                        RecipeComponent::getItemId,
                        RecipeComponent::getQtyBaseUnit,
                        BigDecimal::add
                ));
    }

    private Menu getMenuOrThrow(Long id) {
        return menuRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Menu", id));
    }

    private MenuDto.Response toMenuResponse(Menu m) {
        return MenuDto.Response.builder()
                .id(m.getId())
                .brandId(m.getBrandId())
                .name(m.getName())
                .posMenuId(m.getPosMenuId())
                .isActive(m.getIsActive())
                .build();
    }

    private RecipeComponentDto.Response toComponentResponse(RecipeComponent c) {
        return RecipeComponentDto.Response.builder()
                .id(c.getId())
                .menuId(c.getMenuId())
                .optionId(c.getOptionId())
                .itemId(c.getItemId())
                .qtyBaseUnit(c.getQtyBaseUnit())
                .build();
    }
}
