-- ================================================================
-- BoardEase — Platform feedback ("Rate us" → landing testimonials)
-- ================================================================
-- Stores the star rating + comment a boarder or landlord submits from the
-- "Rate us" page in their dashboard. The landing page reads the newest
-- positive rows (rating >= 4 with a comment) and shows them as testimonials.
--
-- One row per account: `user_id` is UNIQUE, so sending the form again
-- updates that account's existing feedback instead of adding a duplicate.
--
-- Safe to run more than once — creates the table only if it is missing.
-- Needs no other BoardEase table to exist first (no foreign keys).
--
-- Usage (MySQL CLI):
--   mysql -u root boardease < database/platform_reviews.sql
--
-- Or import database/platform_reviews.sql in phpMyAdmin / your MySQL client.
-- ================================================================

USE `boardease`;

CREATE TABLE IF NOT EXISTS `platform_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'boarder',
  `rating` tinyint(4) NOT NULL DEFAULT 5,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Verification
-- ================================================================

SELECT COUNT(*) AS platform_reviews_rows FROM `platform_reviews`;

-- Optional: see what the landing page would show
--   SELECT rating, comment, created_at
--   FROM platform_reviews
--   WHERE rating >= 4 AND comment IS NOT NULL AND comment <> ''
--   ORDER BY created_at DESC
--   LIMIT 3;
