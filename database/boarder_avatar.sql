-- BoardEase — Profile photo support for boarders
-- Adds `avatar_url` to the `users` table so boarders can attach a profile
-- picture. Safe to run on any existing BoardEase database.
--
-- Usage (MySQL CLI):
--   mysql -u root boardease < database/boarder_avatar.sql
--
-- Or import database/boarder_avatar.sql in phpMyAdmin / your MySQL client.

USE boardease;

-- `avatar_url` holds either a data URL (resized JPG/PNG/WebP produced in-browser)
-- or an external image URL. It is NULL when the boarder uses the initials avatar.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url MEDIUMTEXT DEFAULT NULL
  AFTER avatar_color;
