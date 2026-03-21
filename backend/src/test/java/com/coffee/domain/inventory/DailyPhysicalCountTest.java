package com.coffee.domain.inventory;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.entity.*;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.org.repository.UserRepository;
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

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DailyPhysicalCountTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private UserRepository userRepository;

    private String storeManagerToken;
    private String superAdminToken;
    private Long storeId;
    private Long otherStoreId;
    private Long itemId;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Test Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Test Brand").build());
        Store store = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store A").build());
        Store otherStore = storeRepository.save(Store.builder().brandId(brand.getId()).name("Store B").build());
        Item item = itemRepository.save(Item.builder()
                .brandId(brand.getId())
                .name("원두")
                .nameJa("コーヒー豆")
                .baseUnit("g")
                .build());

        storeId = store.getId();
        otherStoreId = otherStore.getId();
        itemId = item.getId();

        User user = userRepository.save(User.builder()
                .email("store@test.com")
                .name("Store Manager")
                .passwordHash("$2a$10$dummyhash")
                .role(Role.STORE_MANAGER)
                .companyId(company.getId())
                .brandId(brand.getId())
                .storeId(store.getId())
                .accountStatus(AccountStatus.ACTIVE)
                .build());

        storeManagerToken = jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), "STORE_MANAGER",
                company.getId(), brand.getId(), store.getId());

        superAdminToken = jwtUtil.generateAccessToken(
                999L, "admin@test.com", "SUPER_ADMIN",
                company.getId(), null, null);
    }

    @Test
    @DisplayName("일별 실사 저장 - 신규 생성")
    void saveNewDailyCount() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "itemId", itemId,
                "countDate", "2026-03-15",
                "qty", 100.5,
                "memo", "morning count"
        ));

        mockMvc.perform(put("/api/v1/daily-counts")
                        .header("Authorization", "Bearer " + storeManagerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.itemId").value(itemId))
                .andExpect(jsonPath("$.data.qty").value(100.5))
                .andExpect(jsonPath("$.data.countDate").value("2026-03-15"));
    }

    @Test
    @DisplayName("일별 실사 저장 - 동일 item+date → upsert (갱신)")
    void saveUpsertDailyCount() throws Exception {
        // First save
        String body1 = objectMapper.writeValueAsString(Map.of(
                "itemId", itemId,
                "countDate", "2026-03-15",
                "qty", 100
        ));
        mockMvc.perform(put("/api/v1/daily-counts")
                        .header("Authorization", "Bearer " + storeManagerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body1))
                .andExpect(status().isOk());

        // Second save (same item, same date, different qty)
        String body2 = objectMapper.writeValueAsString(Map.of(
                "itemId", itemId,
                "countDate", "2026-03-15",
                "qty", 200
        ));
        mockMvc.perform(put("/api/v1/daily-counts")
                        .header("Authorization", "Bearer " + storeManagerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.qty").value(200));
    }

    @Test
    @DisplayName("월별 실사 조회 - 응답 구조 검증")
    void getMonthlyCount() throws Exception {
        // Save some data first
        String body = objectMapper.writeValueAsString(Map.of(
                "itemId", itemId,
                "countDate", "2026-03-15",
                "qty", 100
        ));
        mockMvc.perform(put("/api/v1/daily-counts")
                        .header("Authorization", "Bearer " + storeManagerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        // Get monthly
        mockMvc.perform(get("/api/v1/daily-counts/monthly")
                        .param("storeId", storeId.toString())
                        .param("year", "2026")
                        .param("month", "3")
                        .header("Authorization", "Bearer " + storeManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.year").value(2026))
                .andExpect(jsonPath("$.data.month").value(3))
                .andExpect(jsonPath("$.data.rows").isArray())
                .andExpect(jsonPath("$.data.rows[0].itemId").value(itemId))
                .andExpect(jsonPath("$.data.rows[0].itemName").value("원두"))
                .andExpect(jsonPath("$.data.rows[0].itemNameJa").value("コーヒー豆"))
                .andExpect(jsonPath("$.data.rows[0].dailyCounts.15").value(100));
    }

    @Test
    @DisplayName("STORE_MANAGER는 다른 매장 데이터 접근 불가 (403)")
    void storeManagerCannotAccessOtherStore() throws Exception {
        mockMvc.perform(get("/api/v1/daily-counts/monthly")
                        .param("storeId", otherStoreId.toString())
                        .param("year", "2026")
                        .param("month", "3")
                        .header("Authorization", "Bearer " + storeManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("필수 필드 누락 시 400")
    void saveWithMissingRequiredFields() throws Exception {
        // Missing itemId, countDate, qty
        String body = objectMapper.writeValueAsString(Map.of(
                "memo", "only memo"
        ));
        mockMvc.perform(put("/api/v1/daily-counts")
                        .header("Authorization", "Bearer " + storeManagerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
