ALTER TABLE order_line ADD CONSTRAINT chk_pack_qty CHECK (pack_qty > 0);
