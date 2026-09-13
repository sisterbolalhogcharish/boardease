-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 12, 2026 at 11:47 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `boardease`
--

-- --------------------------------------------------------

--
-- Table structure for table `boarder_profiles`
--

CREATE TABLE `boarder_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `age` int(11) DEFAULT NULL,
  `gender` enum('male','female') DEFAULT NULL,
  `school` varchar(255) DEFAULT NULL,
  `course` varchar(255) DEFAULT NULL,
  `guardian_name` varchar(255) DEFAULT NULL,
  `guardian_phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boarder_profiles`
--

INSERT INTO `boarder_profiles` (`id`, `user_id`, `age`, `gender`, `school`, `course`, `guardian_name`, `guardian_phone`, `address`, `created_at`) VALUES
(2, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-12 14:36:22');

-- --------------------------------------------------------

--
-- Table structure for table `boarder_rentals`
--

CREATE TABLE `boarder_rentals` (
  `id` int(11) NOT NULL,
  `boarder_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `move_in_date` date NOT NULL,
  `contract_end` date NOT NULL,
  `monthly_rent` int(11) NOT NULL,
  `deposit` int(11) DEFAULT 0,
  `advance` int(11) DEFAULT 0,
  `status` enum('active','notice','expiring','ended') DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `boarding_houses`
--

CREATE TABLE `boarding_houses` (
  `id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `tagline` varchar(500) DEFAULT NULL,
  `municipality` varchar(100) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `description` text DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `monthly_rent` int(11) DEFAULT 0,
  `total_rooms` int(11) DEFAULT 0,
  `occupied_rooms` int(11) DEFAULT 0,
  `rating` decimal(2,1) DEFAULT 0.0,
  `reviews_count` int(11) DEFAULT 0,
  `verified` tinyint(1) DEFAULT 0,
  `top_rated` tinyint(1) DEFAULT 0,
  `wifi` tinyint(1) DEFAULT 0,
  `aircon` tinyint(1) DEFAULT 0,
  `kitchen` tinyint(1) DEFAULT 0,
  `laundry` tinyint(1) DEFAULT 0,
  `parking` tinyint(1) DEFAULT 0,
  `pet_friendly` tinyint(1) DEFAULT 0,
  `curfew` varchar(20) DEFAULT NULL,
  `visitor_policy` text DEFAULT NULL,
  `rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rules`)),
  `school_nearby` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`school_nearby`)),
  `distance_from_school` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boarding_houses`
--

INSERT INTO `boarding_houses` (`id`, `landlord_id`, `name`, `tagline`, `municipality`, `barangay`, `address`, `description`, `lat`, `lng`, `monthly_rent`, `total_rooms`, `occupied_rooms`, `rating`, `reviews_count`, `verified`, `top_rated`, `wifi`, `aircon`, `kitchen`, `laundry`, `parking`, `pet_friendly`, `curfew`, `visitor_policy`, `rules`, `school_nearby`, `distance_from_school`, `created_at`, `updated_at`) VALUES
(1, 1, 'Sunset Boarding House', 'Beach-adjacent boarding with fast WiFi & study-friendly rooms', 'San Juan', 'Maite', 'Maite National Road, San Juan, Siquijor', 'Sunset Boarding House sits just minutes away from the famous San Juan sunset strip. Built for students and young professionals, every floor has a shared study lounge, high-speed fiber internet, and 24/7 potable water.', 9.1644000, 123.4962000, 2500, 28, 24, 5.0, 1, 1, 1, 1, 1, 1, 1, 1, 0, '10:00 PM', 'Visitors must register at the front desk. Overnight visitors are not allowed without prior approval.', '[\"Quiet hours from 10:00 PM to 6:00 AM\",\"No smoking inside the building\",\"Guests allowed only until 8:00 PM\",\"Keep common areas clean — assigned weekly chores\"]', '[\"Siquijor State College (Larena)\",\"Siquijor Science High School\"]', '12 min tricycle', '2026-09-06 06:27:40', '2026-09-12 14:18:59');

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `boarder_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_message_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `favorites`
--

CREATE TABLE `favorites` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `favorites`
--

INSERT INTO `favorites` (`id`, `user_id`, `house_id`, `created_at`) VALUES
(2, 3, 1, '2026-09-12 15:15:00');

-- --------------------------------------------------------

--
-- Table structure for table `house_images`
--

CREATE TABLE `house_images` (
  `id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `sort_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `landlords`
--

CREATE TABLE `landlords` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `government_id` varchar(100) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT 0,
  `subscription` enum('none','starter','standard','premium') DEFAULT 'none',
  `location_pref` varchar(255) DEFAULT NULL,
  `location_lat` decimal(10,7) DEFAULT NULL,
  `location_lng` decimal(10,7) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `landlords`
--

INSERT INTO `landlords` (`id`, `user_id`, `business_name`, `address`, `government_id`, `verified`, `subscription`, `created_at`) VALUES
(1, 1, 'Sunset Boarding House', 'Maite National Road, San Juan, Siquijor', NULL, 1, 'standard', '2026-09-06 06:27:40');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `body` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('rent-due','late','contract','vacant','occupancy','review','subscription','reservation','message','availability') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `link` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `rental_id` int(11) NOT NULL,
  `month_key` varchar(7) NOT NULL,
  `label` varchar(100) NOT NULL,
  `amount` int(11) NOT NULL,
  `due_date` date NOT NULL,
  `paid_date` date DEFAULT NULL,
  `status` enum('paid','late','pending','overdue') DEFAULT 'pending',
  `method` varchar(50) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `id` int(11) NOT NULL,
  `boarder_id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `move_in_date` date NOT NULL,
  `duration_months` int(11) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','approved','declined','cancelled') DEFAULT 'pending',
  `owner_response` text DEFAULT NULL,
  `decided_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `boarder_id` int(11) NOT NULL,
  `rating` decimal(2,1) NOT NULL,
  `comment` text DEFAULT NULL,
  `cleanliness` tinyint(4) DEFAULT 5,
  `safety` tinyint(4) DEFAULT 5,
  `comfort` tinyint(4) DEFAULT 5,
  `internet` tinyint(4) DEFAULT 5,
  `owner_rating` tinyint(4) DEFAULT 5,
  `location` tinyint(4) DEFAULT 5,
  `value_rating` tinyint(4) DEFAULT 5,
  `reply` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `room_no` varchar(20) NOT NULL,
  `type` enum('bedspace','single','double','studio') NOT NULL DEFAULT 'bedspace',
  `capacity` int(11) NOT NULL DEFAULT 1,
  `occupied` int(11) NOT NULL DEFAULT 0,
  `monthly_rent` int(11) NOT NULL,
  `gender` enum('male','female','mixed') DEFAULT 'mixed',
  `aircon` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `house_id`, `room_no`, `type`, `capacity`, `occupied`, `monthly_rent`, `gender`, `aircon`, `created_at`) VALUES
(1, 1, '101', 'bedspace', 6, 6, 1500, 'mixed', 0, '2026-09-06 06:27:40'),
(2, 1, '102', 'bedspace', 6, 6, 1500, 'male', 0, '2026-09-06 06:27:40'),
(3, 1, '201', 'single', 1, 1, 2500, 'mixed', 0, '2026-09-06 06:27:40'),
(4, 1, '202', 'single', 1, 1, 2500, 'female', 0, '2026-09-06 06:27:40'),
(5, 1, '203', 'single', 1, 1, 2500, 'male', 0, '2026-09-06 06:27:40'),
(6, 1, '204', 'double', 2, 2, 4000, 'female', 1, '2026-09-06 06:27:40'),
(7, 1, '205', 'double', 2, 1, 4000, 'mixed', 1, '2026-09-06 06:27:40'),
(8, 1, '206', 'studio', 1, 1, 5000, 'mixed', 1, '2026-09-06 06:27:40'),
(9, 1, '207', 'bedspace', 4, 3, 1500, 'female', 0, '2026-09-06 06:27:40'),
(10, 1, '301', 'single', 1, 1, 2800, 'mixed', 1, '2026-09-06 06:27:40'),
(11, 1, '302', 'single', 1, 0, 2800, 'mixed', 1, '2026-09-06 06:27:40'),
(12, 1, '303', 'double', 2, 1, 4200, 'mixed', 1, '2026-09-06 06:27:40');

--
-- ALTER TABLE migrations (run only if columns do not exist)
--

-- Add location_pref columns to landlords if missing
ALTER TABLE `landlords` 
  ADD COLUMN `location_pref` varchar(255) DEFAULT NULL AFTER `subscription`,
  ADD COLUMN `location_lat` decimal(10,7) DEFAULT NULL AFTER `location_pref`,
  ADD COLUMN `location_lng` decimal(10,7) DEFAULT NULL AFTER `location_lat`;

-- Add landlord_documents table if missing
CREATE TABLE IF NOT EXISTS `landlord_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `landlord_id` int(11) NOT NULL,
  `doc_type` enum('valid_id','business_permit','sec_registration','other','legal_documents') NOT NULL,
  `doc_name` varchar(255) NOT NULL,
  `doc_url` mediumtext NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `landlord_documents` ADD PRIMARY KEY (`id`);
ALTER TABLE `landlord_documents` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('landlord','boarder') NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `avatar_color` varchar(7) DEFAULT '#1E73E8',
  `avatar_url` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `phone`, `avatar_color`, `avatar_url`, `created_at`, `updated_at`) VALUES
(1, 'landlord@gmail.com', 'landlord123', 'landlord', 'Rosario C. Cabasan', '0917 555 0100', '#1E73E8', NULL, '2026-09-06 06:27:39', '2026-09-06 06:27:39'),
(3, 'cha@gmail.com', 'cha123', 'boarder', 'Charish Cabasag', '09670724353', '#0B2D63', 'data:image/jpeg;base64,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', '2026-09-12 14:36:22', '2026-09-12 15:19:09');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `boarder_profiles`
--
ALTER TABLE `boarder_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `boarder_rentals`
--
ALTER TABLE `boarder_rentals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `boarder_id` (`boarder_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `house_id` (`house_id`);

--
-- Indexes for table `boarding_houses`
--
ALTER TABLE `boarding_houses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `landlord_id` (`landlord_id`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_conversation` (`boarder_id`,`house_id`),
  ADD KEY `house_id` (`house_id`),
  ADD KEY `idx_conversations_boarder` (`boarder_id`),
  ADD KEY `idx_conversations_landlord` (`landlord_id`);

--
-- Indexes for table `favorites`
--
ALTER TABLE `favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_favorite` (`user_id`,`house_id`),
  ADD KEY `house_id` (`house_id`),
  ADD KEY `idx_favorites_user` (`user_id`);

--
-- Indexes for table `house_images`
--
ALTER TABLE `house_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `house_id` (`house_id`);

--
-- Indexes for table `landlords`
--
ALTER TABLE `landlords`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `idx_messages_conversation` (`conversation_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payments_rental` (`rental_id`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `idx_reservations_boarder` (`boarder_id`),
  ADD KEY `idx_reservations_house` (`house_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `boarder_id` (`boarder_id`),
  ADD KEY `idx_reviews_house` (`house_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rooms_house` (`house_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `boarder_profiles`
--
ALTER TABLE `boarder_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `boarder_rentals`
--
ALTER TABLE `boarder_rentals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `boarding_houses`
--
ALTER TABLE `boarding_houses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `favorites`
--
ALTER TABLE `favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `house_images`
--
ALTER TABLE `house_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `landlords`
--
ALTER TABLE `landlords`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `boarder_profiles`
--
ALTER TABLE `boarder_profiles`
  ADD CONSTRAINT `boarder_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `boarder_rentals`
--
ALTER TABLE `boarder_rentals`
  ADD CONSTRAINT `boarder_rentals_ibfk_1` FOREIGN KEY (`boarder_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `boarder_rentals_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `boarder_rentals_ibfk_3` FOREIGN KEY (`house_id`) REFERENCES `boarding_houses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `boarding_houses`
--
ALTER TABLE `boarding_houses`
  ADD CONSTRAINT `boarding_houses_ibfk_1` FOREIGN KEY (`landlord_id`) REFERENCES `landlords` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`boarder_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`landlord_id`) REFERENCES `landlords` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversations_ibfk_3` FOREIGN KEY (`house_id`) REFERENCES `boarding_houses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `favorites`
--
ALTER TABLE `favorites`
  ADD CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`house_id`) REFERENCES `boarding_houses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `house_images`
--
ALTER TABLE `house_images`
  ADD CONSTRAINT `house_images_ibfk_1` FOREIGN KEY (`house_id`) REFERENCES `boarding_houses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `landlords`
--
ALTER TABLE `landlords`
  ADD CONSTRAINT `landlords_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`rental_id`) REFERENCES `boarder_rentals` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`boarder_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`house_id`) REFERENCES `boarding_houses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservations_ibfk_3` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`house_id`) REFERENCES `boarding_houses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`boarder_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`house_id`) REFERENCES `boarding_houses` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
