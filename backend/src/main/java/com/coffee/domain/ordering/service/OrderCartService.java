package com.coffee.domain.ordering.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.dto.OrderCartDto;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderCartService {

    private final OrderCartRepository cartRepository;
    private final OrderCartItemRepository cartItemRepository;
    private final OrderPlanRepository planRepository;
    private final OrderLineRepository lineRepository;
    private final PackagingRepository packagingRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final ItemRepository itemRepository;

    // ===== NEW: Delivery-date-based cart methods =====

    @Transactional
    public OrderCartDto.CartResponse createOrAddToCart(OrderCartDto.CreateCartRequest request, Long userId) {
        Long storeId = request.getStoreId();
        LocalDate deliveryDate = request.getDeliveryDate();

        // Find or create active cart for this store + delivery date
        OrderCart cart = cartRepository.findByStoreIdAndDeliveryDateAndStatus(storeId, deliveryDate, "ACTIVE")
                .orElseGet(() -> cartRepository.save(OrderCart.builder()
                        .storeId(storeId)
                        .userId(userId)
                        .deliveryDate(deliveryDate)
                        .status("ACTIVE")
                        .build()));

        // Add items with auto supplier mapping
        if (request.getItems() != null) {
            for (OrderCartDto.CartItemInput input : request.getItems()) {
                addItemToCart(cart, input, userId);
            }
        }

        return buildCartResponse(cart);
    }

    public OrderCartDto.CartListResponse getActiveCarts(Long storeId) {
        List<OrderCart> carts = cartRepository.findByStoreIdAndStatusOrderByDeliveryDateAsc(storeId, "ACTIVE");
        List<OrderCartDto.CartResponse> responses = carts.stream()
                .map(this::buildCartResponse)
                .toList();
        return OrderCartDto.CartListResponse.builder().carts(responses).build();
    }

    @Transactional
    public OrderCartDto.CartResponse updateCartItem(Long itemId, OrderCartDto.UpdateItemRequest request) {
        OrderCartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", itemId));
        item.setPackQty(request.getPackQty());
        cartItemRepository.save(item);

        OrderCart cart = cartRepository.findById(item.getCartId())
                .orElseThrow(() -> new ResourceNotFoundException("Cart", item.getCartId()));
        return buildCartResponse(cart);
    }

    @Transactional
    public OrderCartDto.CartResponse removeCartItem(Long itemId) {
        OrderCartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", itemId));
        Long cartId = item.getCartId();
        cartItemRepository.delete(item);

        OrderCart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", cartId));
        return buildCartResponse(cart);
    }

    @Transactional
    public void deleteCart(Long cartId) {
        OrderCart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", cartId));
        cartItemRepository.deleteByCartId(cartId);
        cartRepository.delete(cart);
    }

    private void addItemToCart(OrderCart cart, OrderCartDto.CartItemInput input, Long userId) {
        // Auto-map supplier from packaging -> supplier_item
        List<SupplierItem> supplierItems = supplierItemRepository.findByPackagingId(input.getPackagingId());
        if (supplierItems.isEmpty()) {
            throw new BusinessException("No supplier found for packaging ID: " + input.getPackagingId(),
                    HttpStatus.BAD_REQUEST);
        }
        SupplierItem si = supplierItems.get(0);

        Optional<OrderCartItem> existing = cartItemRepository
                .findByCartIdAndPackagingIdAndSupplierId(cart.getId(), input.getPackagingId(), si.getSupplierId());

        if (existing.isPresent()) {
            OrderCartItem cartItem = existing.get();
            cartItem.setPackQty(cartItem.getPackQty() + input.getQuantity());
            cartItemRepository.save(cartItem);
        } else {
            cartItemRepository.save(OrderCartItem.builder()
                    .cartId(cart.getId())
                    .itemId(input.getItemId())
                    .packagingId(input.getPackagingId())
                    .supplierId(si.getSupplierId())
                    .packQty(input.getQuantity())
                    .unitPrice(si.getPrice())
                    .addedBy(userId)
                    .build());
        }
    }

    // ===== EXISTING: Backward-compatible user-based cart methods =====

    public OrderCartDto.CartResponse getCart(Long storeId, Long userId) {
        Optional<OrderCart> cartOpt = cartRepository.findByStoreIdAndUserId(storeId, userId);
        if (cartOpt.isEmpty()) {
            return OrderCartDto.CartResponse.builder()
                    .cartId(null)
                    .storeId(storeId)
                    .supplierGroups(Collections.emptyList())
                    .grandTotal(BigDecimal.ZERO)
                    .totalItems(0)
                    .build();
        }
        return buildCartResponse(cartOpt.get());
    }

    @Transactional
    public OrderCartDto.CartResponse addItem(Long storeId, Long userId, OrderCartDto.AddItemRequest request) {
        OrderCart cart = getOrCreateCart(storeId, userId);

        Optional<OrderCartItem> existing = cartItemRepository
                .findByCartIdAndPackagingIdAndSupplierId(cart.getId(), request.getPackagingId(), request.getSupplierId());

        if (existing.isPresent()) {
            OrderCartItem item = existing.get();
            item.setPackQty(item.getPackQty() + request.getPackQty());
            cartItemRepository.save(item);
        } else {
            cartItemRepository.save(OrderCartItem.builder()
                    .cartId(cart.getId())
                    .packagingId(request.getPackagingId())
                    .supplierId(request.getSupplierId())
                    .packQty(request.getPackQty())
                    .build());
        }

        return buildCartResponse(cart);
    }

    @Transactional
    public OrderCartDto.CartResponse updateItem(Long storeId, Long userId, Long itemId, OrderCartDto.UpdateItemRequest request) {
        OrderCart cart = cartRepository.findByStoreIdAndUserId(storeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", storeId));

        OrderCartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", itemId));

        if (!item.getCartId().equals(cart.getId())) {
            throw new BusinessException("Cart item does not belong to this cart", HttpStatus.BAD_REQUEST);
        }

        item.setPackQty(request.getPackQty());
        cartItemRepository.save(item);
        return buildCartResponse(cart);
    }

    @Transactional
    public OrderCartDto.CartResponse removeItem(Long storeId, Long userId, Long itemId) {
        OrderCart cart = cartRepository.findByStoreIdAndUserId(storeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", storeId));

        OrderCartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", itemId));

        if (!item.getCartId().equals(cart.getId())) {
            throw new BusinessException("Cart item does not belong to this cart", HttpStatus.BAD_REQUEST);
        }

        cartItemRepository.delete(item);
        return buildCartResponse(cart);
    }

    @Transactional
    public OrderCartDto.CartResponse clearCart(Long storeId, Long userId) {
        OrderCart cart = cartRepository.findByStoreIdAndUserId(storeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", storeId));
        cartItemRepository.deleteByCartId(cart.getId());
        return buildCartResponse(cart);
    }

    @Transactional
    public OrderCartDto.ConfirmResponse confirmCart(Long storeId, Long userId) {
        OrderCart cart = cartRepository.findByStoreIdAndUserId(storeId, userId)
                .orElseThrow(() -> new BusinessException("Cart not found", HttpStatus.BAD_REQUEST));

        List<OrderCartItem> items = cartItemRepository.findByCartId(cart.getId());
        if (items.isEmpty()) {
            throw new BusinessException("Cart is empty", HttpStatus.BAD_REQUEST);
        }

        // Group by supplier
        Map<Long, List<OrderCartItem>> bySupplier = items.stream()
                .collect(Collectors.groupingBy(OrderCartItem::getSupplierId));

        List<Long> planIds = new ArrayList<>();

        for (Map.Entry<Long, List<OrderCartItem>> entry : bySupplier.entrySet()) {
            OrderPlan plan = OrderPlan.builder()
                    .storeId(storeId)
                    .supplierId(entry.getKey())
                    .build();
            planRepository.save(plan);

            for (OrderCartItem cartItem : entry.getValue()) {
                lineRepository.save(OrderLine.builder()
                        .orderPlanId(plan.getId())
                        .packagingId(cartItem.getPackagingId())
                        .packQty(cartItem.getPackQty())
                        .build());
            }

            planIds.add(plan.getId());
        }

        // Clear cart
        cartItemRepository.deleteByCartId(cart.getId());

        return OrderCartDto.ConfirmResponse.builder()
                .orderPlanIds(planIds)
                .orderCount(planIds.size())
                .build();
    }

    @Transactional
    public OrderCartDto.CartResponse copyOrderToCart(Long storeId, Long userId, Long orderPlanId) {
        OrderPlan plan = planRepository.findById(orderPlanId)
                .orElseThrow(() -> new ResourceNotFoundException("OrderPlan", orderPlanId));

        OrderCart cart = getOrCreateCart(storeId, userId);
        List<OrderLine> lines = lineRepository.findByOrderPlanIdAndIsActiveTrue(orderPlanId);

        for (OrderLine line : lines) {
            Optional<OrderCartItem> existing = cartItemRepository
                    .findByCartIdAndPackagingIdAndSupplierId(cart.getId(), line.getPackagingId(), plan.getSupplierId());

            if (existing.isPresent()) {
                OrderCartItem item = existing.get();
                item.setPackQty(item.getPackQty() + line.getPackQty());
                cartItemRepository.save(item);
            } else {
                cartItemRepository.save(OrderCartItem.builder()
                        .cartId(cart.getId())
                        .packagingId(line.getPackagingId())
                        .supplierId(plan.getSupplierId())
                        .packQty(line.getPackQty())
                        .build());
            }
        }

        return buildCartResponse(cart);
    }

    // ===== PRIVATE HELPERS =====

    private OrderCart getOrCreateCart(Long storeId, Long userId) {
        return cartRepository.findByStoreIdAndUserId(storeId, userId)
                .orElseGet(() -> cartRepository.save(OrderCart.builder()
                        .storeId(storeId)
                        .userId(userId)
                        .build()));
    }

    private OrderCartDto.CartResponse buildCartResponse(OrderCart cart) {
        List<OrderCartItem> items = cartItemRepository.findByCartId(cart.getId());

        // Load packaging/supplier data
        Map<Long, Packaging> packagingMap = new HashMap<>();
        Map<Long, Supplier> supplierMap = new HashMap<>();
        Map<Long, BigDecimal> priceMap = new HashMap<>();

        for (OrderCartItem item : items) {
            packagingMap.computeIfAbsent(item.getPackagingId(),
                    id -> packagingRepository.findById(id).orElse(null));
            supplierMap.computeIfAbsent(item.getSupplierId(),
                    id -> supplierRepository.findById(id).orElse(null));

            // Use stored unit_price if available, otherwise look up
            if (item.getUnitPrice() != null) {
                priceMap.put(item.getId(), item.getUnitPrice());
            } else {
                supplierItemRepository.findBySupplierIdAndPackagingId(item.getSupplierId(), item.getPackagingId())
                        .ifPresent(si -> priceMap.put(item.getId(), si.getPrice()));
            }
        }

        // Group by supplier
        Map<Long, List<OrderCartItem>> bySupplier = items.stream()
                .collect(Collectors.groupingBy(OrderCartItem::getSupplierId));

        BigDecimal grandTotal = BigDecimal.ZERO;
        List<OrderCartDto.SupplierGroup> groups = new ArrayList<>();

        for (Map.Entry<Long, List<OrderCartItem>> entry : bySupplier.entrySet()) {
            Supplier supplier = supplierMap.get(entry.getKey());
            BigDecimal subtotal = BigDecimal.ZERO;

            List<OrderCartDto.CartItemResponse> cartItems = new ArrayList<>();
            for (OrderCartItem ci : entry.getValue()) {
                Packaging pkg = packagingMap.get(ci.getPackagingId());
                BigDecimal price = priceMap.getOrDefault(ci.getId(), BigDecimal.ZERO);
                BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(ci.getPackQty()));
                subtotal = subtotal.add(lineTotal);

                // Load item name
                String itemName = null;
                Long itemId = ci.getItemId();
                if (itemId == null && pkg != null) {
                    itemId = pkg.getItemId();
                }
                if (itemId != null) {
                    itemName = itemRepository.findById(itemId).map(Item::getName).orElse(null);
                }

                cartItems.add(OrderCartDto.CartItemResponse.builder()
                        .id(ci.getId())
                        .packagingId(ci.getPackagingId())
                        .packName(pkg != null ? pkg.getPackName() : "Unknown")
                        .itemId(itemId)
                        .itemName(itemName)
                        .unitsPerPack(pkg != null ? pkg.getUnitsPerPack() : BigDecimal.ZERO)
                        .packQty(ci.getPackQty())
                        .price(price)
                        .lineTotal(lineTotal)
                        .build());
            }

            grandTotal = grandTotal.add(subtotal);
            groups.add(OrderCartDto.SupplierGroup.builder()
                    .supplierId(entry.getKey())
                    .supplierName(supplier != null ? supplier.getName() : "Unknown")
                    .items(cartItems)
                    .subtotal(subtotal)
                    .build());
        }

        return OrderCartDto.CartResponse.builder()
                .cartId(cart.getId())
                .storeId(cart.getStoreId())
                .deliveryDate(cart.getDeliveryDate())
                .status(cart.getStatus())
                .supplierGroups(groups)
                .grandTotal(grandTotal)
                .totalItems(items.size())
                .build();
    }
}
