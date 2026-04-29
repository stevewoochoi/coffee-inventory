-- V47: Seed default WAREHOUSE store per active brand (idempotent)
-- Skip brands that already have at least one WAREHOUSE store.

INSERT INTO store (brand_id, name, store_type, is_internal_warehouse,
                   status, timezone, created_at, updated_at)
SELECT b.id,
       CONCAT(b.name, ' 본사 창고'),
       'WAREHOUSE',
       1,
       'ACTIVE',
       'Asia/Tokyo',
       NOW(),
       NOW()
FROM brand b
WHERE b.id NOT IN (
    SELECT brand_id FROM store WHERE store_type = 'WAREHOUSE' AND brand_id IS NOT NULL
);
