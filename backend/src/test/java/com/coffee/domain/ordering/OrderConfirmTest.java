package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.*;
import com.coffee.domain.ordering.service.OrderConfirmService;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OrderConfirmTest {

    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierItemRepository supplierItemRepository;
    @Autowired private DeliveryPolicyRepository policyRepository;
    @Autowired private StoreDeliveryPolicyRepository storePolicyRepository;
    @Autowired private OrderCartRepository cartRepository;
    @Autowired private OrderCartItemRepository cartItemRepository;
    @Autowired private OrderPlanRepository planRepository;
    @Autowired private OrderLineRepository lineRepository;
    @Autowired private OrderConfirmService confirmService;

    private Long storeId;
    private Long brandId;
    private Long supplier1Id;
    private Long supplier2Id;
    private Long packaging1Id;
    private Long packaging2Id;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("Store").build());
        storeId = store.getId();

        Item item1 = itemRepository.save(Item.builder()
                .brandId(brandId).name("Coffee").baseUnit("g").isOrderable(true).build());
        Item item2 = itemRepository.save(Item.builder()
                .brandId(brandId).name("Milk").baseUnit("ml").isOrderable(true).build());

        Packaging pkg1 = packagingRepository.save(Packaging.builder()
                .itemId(item1.getId()).packName("1kg Coffee")
                .unitsPerPack(new BigDecimal("1000")).build());
        Packaging pkg2 = packagingRepository.save(Packaging.builder()
                .itemId(item2.getId()).packName("1L Milk")
                .unitsPerPack(new BigDecimal("1000")).build());
        packaging1Id = pkg1.getId();
        packaging2Id = pkg2.getId();

        Supplier sup1 = supplierRepository.save(Supplier.builder()
                .brandId(brandId).name("Supplier A").build());
        Supplier sup2 = supplierRepository.save(Supplier.builder()
                .brandId(brandId).name("Supplier B").build());
        supplier1Id = sup1.getId();
        supplier2Id = sup2.getId();

        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier1Id).packagingId(packaging1Id)
                .price(new BigDecimal("10000")).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplier2Id).packagingId(packaging2Id)
                .price(new BigDecimal("5000")).build());

        // Delivery policy
        DeliveryPolicy policy = policyRepository.save(DeliveryPolicy.builder()
                .brandId(brandId).policyName("Default")
                .deliveryDays("MON_WED_FRI")
                .cutoffTime(LocalTime.of(9, 0))
                .cutoffLeadDaysBefore(2).cutoffLeadDaysAfter(3)
                .build());
        storePolicyRepository.save(StoreDeliveryPolicy.builder()
                .storeId(storeId).deliveryPolicyId(policy.getId()).isDefault(true).build());
    }

    @Test
    @DisplayName("카트 확정 → 공급사별 OrderPlan 분리")
    void confirmCart_createsOrderPlansPerSupplier() {
        // Create a cart with items from 2 suppliers
        LocalDate deliveryDate = LocalDate.now().plusDays(10);
        OrderCart cart = cartRepository.save(OrderCart.builder()
                .storeId(storeId).userId(1L)
                .deliveryDate(deliveryDate)
                .status("ACTIVE").build());

        cartItemRepository.save(OrderCartItem.builder()
                .cartId(cart.getId()).packagingId(packaging1Id)
                .supplierId(supplier1Id).packQty(3)
                .unitPrice(new BigDecimal("10000")).build());
        cartItemRepository.save(OrderCartItem.builder()
                .cartId(cart.getId()).packagingId(packaging2Id)
                .supplierId(supplier2Id).packQty(5)
                .unitPrice(new BigDecimal("5000")).build());

        var response = confirmService.confirmCart(cart.getId());

        assertThat(response.getOrderCount()).isEqualTo(2);
        assertThat(response.getOrderPlanIds()).hasSize(2);
    }

    @Test
    @DisplayName("카트 확정 → 상태 CONFIRMED 설정")
    void confirmCart_setsStatusConfirmed() {
        OrderCart cart = cartRepository.save(OrderCart.builder()
                .storeId(storeId).userId(1L)
                .deliveryDate(LocalDate.now().plusDays(10))
                .status("ACTIVE").build());

        cartItemRepository.save(OrderCartItem.builder()
                .cartId(cart.getId()).packagingId(packaging1Id)
                .supplierId(supplier1Id).packQty(2)
                .unitPrice(new BigDecimal("10000")).build());

        var response = confirmService.confirmCart(cart.getId());

        OrderPlan plan = planRepository.findById(response.getOrderPlanIds().get(0)).orElseThrow();
        assertThat(plan.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(plan.getConfirmedAt()).isNotNull();
    }

    @Test
    @DisplayName("카트 확정 → 합계/VAT 계산")
    void confirmCart_calculatesTotalAndVat() {
        OrderCart cart = cartRepository.save(OrderCart.builder()
                .storeId(storeId).userId(1L)
                .deliveryDate(LocalDate.now().plusDays(10))
                .status("ACTIVE").build());

        // 3 packs * 10000 = 30000
        cartItemRepository.save(OrderCartItem.builder()
                .cartId(cart.getId()).packagingId(packaging1Id)
                .supplierId(supplier1Id).packQty(3)
                .unitPrice(new BigDecimal("10000")).build());

        var response = confirmService.confirmCart(cart.getId());

        OrderPlan plan = planRepository.findById(response.getOrderPlanIds().get(0)).orElseThrow();
        assertThat(plan.getTotalAmount()).isEqualByComparingTo("30000");
        assertThat(plan.getVatAmount()).isEqualByComparingTo("3000.00"); // 10% VAT
    }

    @Test
    @DisplayName("발주 취소 - cutoff 이전 성공")
    void cancelOrder_beforeCutoff_succeeds() {
        // Create order with cutoff far in the future
        OrderPlan plan = planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplier1Id)
                .status(OrderStatus.CONFIRMED)
                .cutoffAt(LocalDateTime.now().plusDays(3))
                .build());

        confirmService.cancelOrder(plan.getId());

        OrderPlan updated = planRepository.findById(plan.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    @DisplayName("발주 취소 - cutoff 이후 실패 (400)")
    void cancelOrder_afterCutoff_fails() {
        // Create order with cutoff in the past
        OrderPlan plan = planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplier1Id)
                .status(OrderStatus.CONFIRMED)
                .cutoffAt(LocalDateTime.now().minusHours(1))
                .build());

        assertThatThrownBy(() -> confirmService.cancelOrder(plan.getId()))
                .isInstanceOf(com.coffee.common.exception.BusinessException.class);
    }

    @Test
    @DisplayName("발주 수정 - cutoff 이전 성공")
    void modifyOrder_beforeCutoff_succeeds() {
        OrderPlan plan = planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplier1Id)
                .status(OrderStatus.CONFIRMED)
                .cutoffAt(LocalDateTime.now().plusDays(3))
                .build());
        lineRepository.save(OrderLine.builder()
                .orderPlanId(plan.getId()).packagingId(packaging1Id).packQty(3).build());

        var modifyRequest = new com.coffee.domain.ordering.dto.OrderPlanDto.ModifyRequest();
        var lineDto = new com.coffee.domain.ordering.dto.OrderPlanDto.OrderLineDto();
        lineDto.setPackagingId(packaging1Id);
        lineDto.setPackQty(5);
        modifyRequest.setLines(List.of(lineDto));

        var response = confirmService.modifyOrder(plan.getId(), modifyRequest);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");

        // Verify line was updated
        List<OrderLine> lines = lineRepository.findByOrderPlanId(plan.getId());
        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).getPackQty()).isEqualTo(5);
    }

    @Test
    @DisplayName("발주 수정 - cutoff 이후 실패")
    void modifyOrder_afterCutoff_fails() {
        OrderPlan plan = planRepository.save(OrderPlan.builder()
                .storeId(storeId).supplierId(supplier1Id)
                .status(OrderStatus.CONFIRMED)
                .cutoffAt(LocalDateTime.now().minusHours(1))
                .build());

        var modifyRequest = new com.coffee.domain.ordering.dto.OrderPlanDto.ModifyRequest();

        assertThatThrownBy(() -> confirmService.modifyOrder(plan.getId(), modifyRequest))
                .isInstanceOf(com.coffee.common.exception.BusinessException.class);
    }

    @Test
    @DisplayName("빈 카트 확정 시 에러")
    void confirmCart_emptyCart_fails() {
        OrderCart cart = cartRepository.save(OrderCart.builder()
                .storeId(storeId).userId(1L)
                .deliveryDate(LocalDate.now().plusDays(10))
                .status("ACTIVE").build());

        assertThatThrownBy(() -> confirmService.confirmCart(cart.getId()))
                .isInstanceOf(com.coffee.common.exception.BusinessException.class);
    }
}
