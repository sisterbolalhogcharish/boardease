-- ================================================================
-- BoardEase — Admin Account Setup
-- ================================================================
-- Safe to run multiple times in phpMyAdmin or MySQL CLI.
-- No procedures, no DELIMITER changes.
--
-- Default admin credentials:
--   Email:    admin@gmail.com
--   Password: admin123
-- ================================================================

USE `boardease`;

-- ================================================================
-- STEP 1: Add 'admin' to users.role enum
-- ================================================================

-- Check if 'admin' is already in the enum
SET @has_admin = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'boardease'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
    AND COLUMN_TYPE LIKE '%admin%'
);

-- If admin is NOT in the enum, alter the column
-- We use a prepared statement to avoid syntax errors
SET @sql = IF(
  @has_admin = 0,
  'ALTER TABLE `users` MODIFY COLUMN `role` ENUM(''landlord'',''boarder'',''admin'') NOT NULL',
  'SELECT ''admin enum already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ================================================================
-- STEP 2: Insert the default admin user
-- ================================================================

INSERT IGNORE INTO `users`
  (`id`, `email`, `password`, `role`, `name`, `phone`, `avatar_color`, `avatar_url`, `created_at`, `updated_at`)
VALUES
  (4, 'admin@gmail.com', 'admin123', 'admin', 'System Administrator', '0900 000 0000', '#0B2D63', NULL, NOW(), NOW());

-- ================================================================
-- STEP 3: Verify
-- ================================================================

SELECT `id`, `email`, `name`, `role` FROM `users` WHERE `role` = 'admin';
