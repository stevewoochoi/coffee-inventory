package com.coffee.domain.pos;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.recipe.entity.Menu;
import com.coffee.domain.recipe.entity.RecipeComponent;
import com.coffee.domain.recipe.repository.MenuRepository;
import com.coffee.domain.recipe.repository.RecipeComponentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PosSalesFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private MenuRepository menuRepository;
    @Autowired private RecipeComponentRepository componentRepository;
    @Autowired private InventoryService inventoryService;
    @Autowired private InventorySnapshotRepository snapshotRepository;

    private String token;
    private Long storeId;
    private Long menuId;
    private Long coffeeItemId;
    private Long milkItemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store").build());
        storeId = store.getId();

        Item coffee = itemRepository.save(Item.builder().brandId(brand.getId()).name("Coffee Bean").baseUnit("g").build());
        Item milk = itemRepository.save(Item.builder().brandId(brand.getId()).name("Milk").baseUnit("ml").build());
        coffeeItemId = coffee.getId();
        milkItemId = milk.getId();

        // 재고 입고
        inventoryService.recordStockChange(storeId, coffeeItemId, new BigDecimal("5000"), LedgerType.RECEIVE, null, null, null, null);
        inventoryService.recordStockChange(storeId, milkItemId, new BigDecimal("10000"), LedgerType.RECEIVE, null, null, null, null);

        // 메뉴: 카페라테 = 커피 20g + 우유 200ml
        Menu menu = menuRepository.save(Menu.builder().brandId(brand.getId()).name("Cafe Latte").build());
        menuId = menu.getId();
        componentRepository.save(RecipeComponent.builder().menuId(menuId).itemId(coffeeItemId).qtyBaseUnit(new BigDecimal("20")).build());
        componentRepository.save(RecipeComponent.builder().menuId(menuId).itemId(milkItemId).qtyBaseUnit(new BigDecimal("200")).build());

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER", company.getId(), brand.getId(), storeId);
    }

    @Test
    @DisplayName("POS 판매 → 레시피 기반 재고 차감")
    void posSaleDeductsInventory() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "businessDate", LocalDate.now().toString(),
                "menuId", menuId, "qty", 3));

        mockMvc.perform(post("/api/v1/pos/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.qty").value(3));

        // 커피: 5000 - (20 * 3) = 4940
        Optional<InventorySnapshot> coffeeSnapshot = snapshotRepository.findByStoreIdAndItemId(storeId, coffeeItemId);
        assertThat(coffeeSnapshot).isPresent();
        assertThat(coffeeSnapshot.get().getQtyBaseUnit()).isEqualByComparingTo("4940");

        // 우유: 10000 - (200 * 3) = 9400
        Optional<InventorySnapshot> milkSnapshot = snapshotRepository.findByStoreIdAndItemId(storeId, milkItemId);
        assertThat(milkSnapshot).isPresent();
        assertThat(milkSnapshot.get().getQtyBaseUnit()).isEqualByComparingTo("9400");
    }
}
