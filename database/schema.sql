-- ============================================================
-- BoardEase Database Schema for XAMPP (MySQL / MariaDB)
-- ============================================================
-- Run this file in phpMyAdmin or mysql CLI after creating
-- the database: CREATE DATABASE boardease;
-- ============================================================

CREATE DATABASE IF NOT EXISTS boardease CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE boardease;

-- ============================================================
-- 1. USERS  (shared login table for landlords & boarders)
-- ============================================================
CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- plain for now; hash in production
    role        ENUM('landlord','boarder') NOT NULL,
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(50)  DEFAULT NULL,
    avatar_color VARCHAR(7)  DEFAULT '#1E73E8',
    avatar_url  MEDIUMTEXT   DEFAULT NULL,        -- uploaded profile photo (data URL)
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. LANDLORDS  (profile extension for landlord users)
-- ============================================================
CREATE TABLE landlords (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    business_name   VARCHAR(255) DEFAULT NULL,
    address         TEXT         DEFAULT NULL,
    government_id   VARCHAR(100) DEFAULT NULL,   -- e.g. national ID number
    verified        BOOLEAN      DEFAULT FALSE,
    subscription    ENUM('none','starter','standard','premium') DEFAULT 'none',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. BOARDERS  (profile extension for boarder users)
-- ============================================================
CREATE TABLE boarder_profiles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    age             INT           DEFAULT NULL,
    gender          ENUM('male','female') DEFAULT NULL,
    school          VARCHAR(255)  DEFAULT NULL,
    course          VARCHAR(255)  DEFAULT NULL,
    guardian_name   VARCHAR(255)  DEFAULT NULL,
    guardian_phone  VARCHAR(50)   DEFAULT NULL,
    address         TEXT          DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. BOARDING HOUSES
-- ============================================================
CREATE TABLE boarding_houses (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id     INT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    tagline         VARCHAR(500) DEFAULT NULL,
    municipality    VARCHAR(100) NOT NULL,
    barangay        VARCHAR(100) NOT NULL,
    address         TEXT         NOT NULL,
    description     TEXT         DEFAULT NULL,
    lat             DECIMAL(10,7) DEFAULT NULL,
    lng             DECIMAL(10,7) DEFAULT NULL,
    monthly_rent    INT          DEFAULT 0,       -- base/minimum rent
    total_rooms     INT          DEFAULT 0,
    occupied_rooms  INT          DEFAULT 0,
    rating          DECIMAL(2,1) DEFAULT 0.0,
    reviews_count   INT          DEFAULT 0,
    verified        BOOLEAN      DEFAULT FALSE,
    top_rated       BOOLEAN      DEFAULT FALSE,
    wifi            BOOLEAN      DEFAULT FALSE,
    aircon          BOOLEAN      DEFAULT FALSE,
    kitchen         BOOLEAN      DEFAULT FALSE,
    laundry         BOOLEAN      DEFAULT FALSE,
    parking         BOOLEAN      DEFAULT FALSE,
    pet_friendly    BOOLEAN      DEFAULT FALSE,
    curfew          VARCHAR(20)  DEFAULT NULL,
    visitor_policy  TEXT         DEFAULT NULL,
    rules           JSON         DEFAULT NULL,     -- array of rule strings
    school_nearby   JSON         DEFAULT NULL,     -- array of school names
    distance_from_school VARCHAR(100) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. HOUSE IMAGES
-- ============================================================
CREATE TABLE house_images (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    house_id    INT NOT NULL,
    image_url   VARCHAR(500) NOT NULL,
    sort_order  INT DEFAULT 0,
    FOREIGN KEY (house_id) REFERENCES boarding_houses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. ROOMS
-- ============================================================
CREATE TABLE rooms (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    house_id      INT NOT NULL,
    room_no       VARCHAR(20)  NOT NULL,
    type          ENUM('bedspace','single','double','studio') NOT NULL DEFAULT 'bedspace',
    capacity      INT          NOT NULL DEFAULT 1,
    occupied      INT          NOT NULL DEFAULT 0,
    monthly_rent  INT          NOT NULL,
    gender        ENUM('male','female','mixed') DEFAULT 'mixed',
    aircon        BOOLEAN      DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (house_id) REFERENCES boarding_houses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. BOARDER RENTALS  (links a boarder to a room in a house)
-- ============================================================
CREATE TABLE boarder_rentals (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id    INT NOT NULL,
    room_id       INT NOT NULL,
    house_id      INT NOT NULL,
    move_in_date  DATE         NOT NULL,
    contract_end  DATE         NOT NULL,
    monthly_rent  INT          NOT NULL,
    deposit       INT          DEFAULT 0,
    advance       INT          DEFAULT 0,
    status        ENUM('active','notice','expiring','ended') DEFAULT 'active',
    notes         TEXT         DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id)    REFERENCES rooms(id)    ON DELETE CASCADE,
    FOREIGN KEY (house_id)   REFERENCES boarding_houses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    rental_id     INT NOT NULL,
    month_key     VARCHAR(7)   NOT NULL,          -- e.g. '2026-08'
    label         VARCHAR(100) NOT NULL,          -- e.g. 'August 2026'
    amount        INT          NOT NULL,
    due_date      DATE         NOT NULL,
    paid_date     DATE         DEFAULT NULL,
    status        ENUM('paid','late','pending','overdue') DEFAULT 'pending',
    method        VARCHAR(50)  DEFAULT NULL,      -- GCash, Cash, etc.
    reference     VARCHAR(100) DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES boarder_rentals(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. REVIEWS
-- ============================================================
CREATE TABLE reviews (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    house_id      INT NOT NULL,
    boarder_id    INT NOT NULL,
    rating        DECIMAL(2,1) NOT NULL,
    comment       TEXT         DEFAULT NULL,
    cleanliness   TINYINT      DEFAULT 5,
    safety        TINYINT      DEFAULT 5,
    comfort       TINYINT      DEFAULT 5,
    internet      TINYINT      DEFAULT 5,
    owner_rating  TINYINT      DEFAULT 5,
    location      TINYINT      DEFAULT 5,
    value_rating  TINYINT      DEFAULT 5,
    reply         TEXT         DEFAULT NULL,      -- landlord reply
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (house_id)   REFERENCES boarding_houses(id) ON DELETE CASCADE,
    FOREIGN KEY (boarder_id) REFERENCES users(id)           ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    type          ENUM('rent-due','late','contract','vacant','occupancy','review','subscription') NOT NULL,
    title         VARCHAR(255) NOT NULL,
    message       TEXT         NOT NULL,
    is_read       BOOLEAN      DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SAMPLE DATA — Login Credentials
-- ============================================================

-- Landlord account
INSERT INTO users (email, password, role, name, phone, avatar_color)
VALUES ('landlord@gmail.com', 'landlord123', 'landlord', 'Rosario C. Cabasan', '0917 555 0100', '#1E73E8');

INSERT INTO landlords (user_id, business_name, address, verified, subscription)
VALUES (1, 'Sunset Boarding House', 'Maite National Road, San Juan, Siquijor', TRUE, 'standard');

-- Boarder account
INSERT INTO users (email, password, role, name, phone, avatar_color)
VALUES ('boarder@gmail.com', 'boarder123', 'boarder', 'Jessa Marie Cabanero', '0917 555 0101', '#33C7A5');

INSERT INTO boarder_profiles (user_id, age, gender, school, course, guardian_name, guardian_phone, address)
VALUES (2, 20, 'female', 'Siquijor State College', 'BS Computer Science', 'Lourdes Cabanero', '0918 555 0200', 'Lazi, Siquijor');

-- ============================================================
-- SAMPLE DATA — Boarding House (Sunset)
-- ============================================================
INSERT INTO boarding_houses (
    landlord_id, name, tagline, municipality, barangay, address,
    description, lat, lng, monthly_rent, total_rooms, occupied_rooms,
    rating, reviews_count, verified, top_rated,
    wifi, aircon, kitchen, laundry, parking, pet_friendly,
    curfew, visitor_policy, rules, school_nearby, distance_from_school
) VALUES (
    1, 'Sunset Boarding House',
    'Beach-adjacent boarding with fast WiFi & study-friendly rooms',
    'San Juan', 'Maite', 'Maite National Road, San Juan, Siquijor',
    'Sunset Boarding House sits just minutes away from the famous San Juan sunset strip. Built for students and young professionals, every floor has a shared study lounge, high-speed fiber internet, and 24/7 potable water.',
    9.1644, 123.4962, 2500, 28, 23,
    4.9, 47, TRUE, TRUE,
    TRUE, TRUE, TRUE, TRUE, TRUE, FALSE,
    '10:00 PM',
    'Visitors must register at the front desk. Overnight visitors are not allowed without prior approval.',
    '["Quiet hours from 10:00 PM to 6:00 AM","No smoking inside the building","Guests allowed only until 8:00 PM","Keep common areas clean — assigned weekly chores"]',
    '["Siquijor State College (Larena)","Siquijor Science High School"]',
    '12 min tricycle'
);

-- Sample rooms for Sunset Boarding House
INSERT INTO rooms (house_id, room_no, type, capacity, occupied, monthly_rent, gender, aircon) VALUES
(1, '101', 'bedspace', 6, 6, 1500, 'mixed',  FALSE),
(1, '102', 'bedspace', 6, 5, 1500, 'male',   FALSE),
(1, '201', 'single',   1, 1, 2500, 'mixed',  FALSE),
(1, '202', 'single',   1, 1, 2500, 'female', FALSE),
(1, '203', 'single',   1, 1, 2500, 'male',   FALSE),
(1, '204', 'double',   2, 2, 4000, 'female', TRUE),
(1, '205', 'double',   2, 1, 4000, 'mixed',  TRUE),
(1, '206', 'studio',   1, 1, 5000, 'mixed',  TRUE),
(1, '207', 'bedspace', 4, 3, 1500, 'female', FALSE),
(1, '301', 'single',   1, 1, 2800, 'mixed',  TRUE),
(1, '302', 'single',   1, 0, 2800, 'mixed',  TRUE),
(1, '303', 'double',   2, 1, 4200, 'mixed',  TRUE);

-- ============================================================
-- Useful indexes
-- ============================================================
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_rooms_house    ON rooms(house_id);
CREATE INDEX idx_payments_rental ON payments(rental_id);
CREATE INDEX idx_reviews_house  ON reviews(house_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
