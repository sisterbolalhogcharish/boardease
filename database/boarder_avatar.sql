-- ============================================================
-- BoardEase — profile photo migration
-- ============================================================
-- Adds users.avatar_url so a boarder can attach a profile picture.
--
-- The photo is stored as a small, client-resized square JPEG data URL
-- (~320x320, usually 20-60 KB), so no upload folder or extra server
-- dependency (multer etc.) is required and the image travels with the
-- account on every query.
--
-- Run ONCE:  mysql -u root boardease < database/boarder_avatar.sql
-- or import this file in phpMyAdmin.
--
-- The ALTER is guarded, so running it twice is harmless.
-- ============================================================

USE boardease;

SET @has_avatar_url = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_url'
);

SET @add_avatar_sql = IF(
    @has_avatar_url = 0,
    'ALTER TABLE users ADD COLUMN avatar_url MEDIUMTEXT DEFAULT NULL AFTER avatar_color',
    'SELECT ''users.avatar_url already exists — nothing to do'' AS note'
);

PREPARE avatar_stmt FROM @add_avatar_sql;
EXECUTE avatar_stmt;
DEALLOCATE PREPARE avatar_stmt;
