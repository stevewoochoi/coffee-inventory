-- V45: Snapshot unit price at order confirm time
-- Without this, admin order detail shows 0 when supplier_item lookup fails or price is null.
-- Backfill from supplier_item where possible.

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='order_line' AND COLUMN_NAME='unit_price');
SET @q = IF(@col=0,
    'ALTER TABLE order_line ADD COLUMN unit_price DECIMAL(12,2) NULL',
    'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill historical lines: try supplier_item by (plan.supplier_id, line.packaging_id)
UPDATE order_line ol
JOIN order_plan op ON op.id = ol.order_plan_id
JOIN supplier_item si ON si.supplier_id = op.supplier_id AND si.packaging_id = ol.packaging_id
SET ol.unit_price = si.price
WHERE ol.unit_price IS NULL AND si.price IS NOT NULL;

-- Fallback: any supplier_item for this packaging (price may differ across suppliers but better than 0)
UPDATE order_line ol
JOIN supplier_item si ON si.packaging_id = ol.packaging_id
SET ol.unit_price = si.price
WHERE ol.unit_price IS NULL AND si.price IS NOT NULL;

-- Last resort: fall back to item.price * units_per_pack
UPDATE order_line ol
JOIN packaging p ON p.id = ol.packaging_id
JOIN item i ON i.id = p.item_id
SET ol.unit_price = i.price * COALESCE(p.units_per_pack, 1)
WHERE ol.unit_price IS NULL AND i.price IS NOT NULL;
