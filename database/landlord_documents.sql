-- Landlord verification documents for sign-up
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS `landlord_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `landlord_id` int(11) NOT NULL,
  `doc_type` enum('valid_id','business_permit','sec_registration','other','legal_documents') NOT NULL,
  `doc_name` varchar(255) NOT NULL,
  `doc_url` mediumtext NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `landlord_id` (`landlord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `landlord_documents`
  MODIFY `doc_type` enum('valid_id','business_permit','sec_registration','other','legal_documents') NOT NULL,
  MODIFY `doc_url` mediumtext NOT NULL;
