-- =============================================
-- V8: 이미지 URL 컬럼 추가
-- =============================================

ALTER TABLE item ADD COLUMN image_url VARCHAR(500) AFTER is_active;
ALTER TABLE packaging ADD COLUMN image_url VARCHAR(500) AFTER status;
