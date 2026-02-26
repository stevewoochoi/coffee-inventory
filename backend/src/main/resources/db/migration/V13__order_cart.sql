-- V13: Order cart tables
CREATE TABLE order_cart (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_store_user (store_id, user_id)
);

CREATE TABLE order_cart_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cart_id BIGINT NOT NULL,
    packaging_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    pack_qty INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_item (cart_id, packaging_id, supplier_id),
    CONSTRAINT fk_cart_item_cart FOREIGN KEY (cart_id) REFERENCES order_cart(id) ON DELETE CASCADE
);
