-- V13의 레거시 unique 제약 제거 (store_id, user_id 조합이 장바구니 중복 생성 차단함)
-- V17 이후 delivery_date 기반 장바구니 설계로 변경됨
DROP INDEX uq_cart_store_user ON order_cart;
