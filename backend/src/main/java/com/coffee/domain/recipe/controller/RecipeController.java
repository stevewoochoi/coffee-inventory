package com.coffee.domain.recipe.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.recipe.dto.MenuDto;
import com.coffee.domain.recipe.dto.RecipeComponentDto;
import com.coffee.domain.recipe.service.RecipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipe/menus")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class RecipeController {

    private final RecipeService recipeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MenuDto.Response>>> findMenus(
            @RequestParam Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(recipeService.findMenusByBrandId(brandId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuDto.Response>> findMenu(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(recipeService.findMenuById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MenuDto.Response>> createMenu(
            @Valid @RequestBody MenuDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(recipeService.createMenu(request), "Menu created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuDto.Response>> updateMenu(
            @PathVariable Long id, @Valid @RequestBody MenuDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(recipeService.updateMenu(id, request), "Menu updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable Long id) {
        recipeService.deleteMenu(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Menu deactivated"));
    }

    @GetMapping("/{menuId}/components")
    public ResponseEntity<ApiResponse<List<RecipeComponentDto.Response>>> findComponents(
            @PathVariable Long menuId) {
        return ResponseEntity.ok(ApiResponse.ok(recipeService.findComponentsByMenuId(menuId)));
    }

    @PostMapping("/{menuId}/components")
    public ResponseEntity<ApiResponse<RecipeComponentDto.Response>> addComponent(
            @PathVariable Long menuId, @Valid @RequestBody RecipeComponentDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(recipeService.addComponent(menuId, request), "Component added"));
    }

    @DeleteMapping("/{menuId}/components/{componentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComponent(
            @PathVariable Long menuId, @PathVariable Long componentId) {
        recipeService.deleteComponent(componentId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Component removed"));
    }
}
