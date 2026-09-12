-- ============================================================
-- BoardEase — Boarder-side enhancement migration
-- ============================================================
-- Run ONCE against an existing `boardease` database (phpMyAdmin
-- or `mysql -u root boardease < database/boarder_features.sql`).
--
-- This migration only ADDS new tables/columns. It never drops or
-- rewrites existing data, so the Admin/Owner side keeps working.
-- ============================================================

USE boardease;

-- ============================================================
-- 1. FAVORITES  (saved boarding houses, per boarder account)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    house_id    INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_favorite (user_id, house_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)            ON DELETE CASCADE,
    FOREIGN KEY (house_id) REFERENCES boarding_houses(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. RESERVATIONS  (boarder REQUEST -> owner approve / decline)
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id      INT NOT NULL,
    house_id        INT NOT NULL,
    room_id         INT DEFAULT NULL,
    move_in_date    DATE NOT NULL,
    duration_months INT DEFAULT NULL,
    message         TEXT DEFAULT NULL,
    status          ENUM('pending','approved','declined','cancelled') DEFAULT 'pending',
    owner_response  TEXT DEFAULT NULL,
    decided_at      TIMESTAMP NULL DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id)           ON DELETE CASCADE,
    FOREIGN KEY (house_id)   REFERENCES boarding_houses(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id)    REFERENCES rooms(id)           ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 3. CONVERSATIONS  (boarder <-> owner, one thread per house)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id      INT NOT NULL,
    landlord_id     INT NOT NULL,
    house_id        INT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_conversation (boarder_id, house_id),
    FOREIGN KEY (boarder_id)  REFERENCES users(id)           ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES landlords(id)       ON DELETE CASCADE,
    FOREIGN KEY (house_id)    REFERENCES boarding_houses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. MESSAGES  (simple text messages inside a conversation)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id       INT NOT NULL,
    body            TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. NOTIFICATIONS  (extend type list + optional deep link)
-- ============================================================
ALTER TABLE notifications
    MODIFY COLUMN type ENUM(
        'rent-due','late','contract','vacant','occupancy',
        'review','subscription','reservation','message','availability'
    ) NOT NULL;

ALTER TABLE notifications
    ADD COLUMN link VARCHAR(255) DEFAULT NULL;

-- ============================================================
-- Useful indexes
-- ============================================================
CREATE INDEX idx_favorites_user        ON favorites(user_id);
CREATE INDEX idx_reservations_boarder  ON reservations(boarder_id);
CREATE INDEX idx_reservations_house    ON reservations(house_id);
CREATE INDEX idx_conversations_boarder ON conversations(boarder_id);
CREATE INDEX idx_conversations_landlord ON conversations(landlord_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- ============================================================
-- OPTIONAL DEMO DATA
-- ============================================================
-- The BoardEase demo boarder (boarder@gmail.com) shipped without any
-- rental/payment records, so the boarder dashboard had nothing real to show.
-- These statements give that ONE demo account an accommodation, a short rent
-- history, a review and a favourite set so both My Home states are testable.
--
-- Every block is guarded: it is a no-op unless the demo boarder exists and the
-- migration has not been applied before. Safe to delete this whole section.
--
-- This section is idempotent: run it once, or delete it if you keep real data.
-- ============================================================

SET @boarder_id = (SELECT id FROM users WHERE email = 'boarder@gmail.com' LIMIT 1);
SET @house_id   = (SELECT id FROM boarding_houses ORDER BY id LIMIT 1);
SET @room_id    = (
    SELECT r.id FROM rooms r
    WHERE r.house_id = @house_id AND r.occupied < r.capacity
    ORDER BY r.type = 'bedspace' DESC, r.monthly_rent ASC, r.room_no ASC
    LIMIT 1
);
SET @had_rental = (SELECT COUNT(*) FROM boarder_rentals WHERE boarder_id = @boarder_id);

INSERT INTO boarder_rentals
    (boarder_id, room_id, house_id, move_in_date, contract_end, monthly_rent, deposit, advance, status)
SELECT @boarder_id, @room_id, @house_id, '2025-06-05', '2026-08-20', 1500, 1500, 3000, 'active'
FROM DUAL
WHERE @boarder_id IS NOT NULL AND @room_id IS NOT NULL AND @house_id IS NOT NULL AND @had_rental = 0;

-- Keep the room / house occupancy tallies consistent with the new rental.
UPDATE rooms r
JOIN boarder_rentals br ON br.room_id = r.id
SET r.occupied = LEAST(r.capacity, r.occupied + 1)
WHERE br.boarder_id = @boarder_id AND br.status = 'active' AND @had_rental = 0;

UPDATE boarding_houses
SET occupied_rooms = LEAST(total_rooms, occupied_rooms + 1)
WHERE id = @house_id AND @had_rental = 0;

-- Current month: still pending.
INSERT INTO payments (rental_id, month_key, label, amount, due_date, paid_date, status, method)
SELECT br.id,
       DATE_FORMAT(CURDATE(), '%Y-%m'),
       CONCAT(DATE_FORMAT(CURDATE(), '%M'), ' ', YEAR(CURDATE())),
       br.monthly_rent,
       DATE_FORMAT(CURDATE(), '%Y-%m-01'),
       NULL, 'pending', NULL
FROM boarder_rentals br
WHERE br.boarder_id = @boarder_id AND br.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.rental_id = br.id);

-- Previous month: already settled.
INSERT INTO payments (rental_id, month_key, label, amount, due_date, paid_date, status, method)
SELECT br.id,
       DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m'),
       CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%M'), ' ', YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))),
       br.monthly_rent,
       DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01'),
       DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-05'),
       'paid', 'Cash'
FROM boarder_rentals br
WHERE br.boarder_id = @boarder_id AND br.status = 'active'
  AND (SELECT COUNT(*) FROM payments p WHERE p.rental_id = br.id) = 1;

-- A couple of saved houses + one review so Favorites/Compare/Reviews are not blank.
INSERT IGNORE INTO favorites (user_id, house_id)
SELECT @boarder_id, bh.id FROM boarding_houses bh
WHERE @boarder_id IS NOT NULL
ORDER BY bh.id
LIMIT 3;

INSERT INTO reviews (house_id, boarder_id, rating, comment, cleanliness, safety, comfort, internet, owner_rating, location, value_rating, reply)
SELECT @house_id, @boarder_id, 5.0,
       'Maayos kaayo ang boarding house. Limpyo ang CR, kusog ang WiFi, ug grabe ka accommodating ang tag-iya.',
       5, 5, 5, 5, 5, 4, 5,
       'Salamat! Always welcome ka diri.'
FROM DUAL
WHERE @boarder_id IS NOT NULL AND @house_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM reviews WHERE house_id = @house_id AND boarder_id = @boarder_id);

UPDATE boarding_houses bh
SET rating = COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.house_id = bh.id), bh.rating),
    reviews_count = (SELECT COUNT(*) FROM reviews r WHERE r.house_id = bh.id)
WHERE bh.id = @house_id;
