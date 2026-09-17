import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pool from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(cors())
app.use(express.json({ limit: '15mb' }))

/* ================================================================
   SHARED HELPERS
   ================================================================ */

/** Insert an in-app notification, tolerating databases that have not
 *  run database/boarder_features.sql yet (missing `link` column). */
async function insertNotification(userId, type, title, message, link = null) {
  if (!userId) return
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, message, link]
    )
  } catch {
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        [userId, type, title, message]
      )
    } catch (err) {
      console.error('Insert notification failed:', err.message)
    }
  }
}

/** Tell boarders who favorited a house that a room just freed up. */
async function notifyAvailability(houseId, roomNo) {
  try {
    const [favs] = await pool.query('SELECT DISTINCT user_id FROM favorites WHERE house_id = ?', [houseId])
    if (favs.length === 0) return
    const [house] = await pool.query('SELECT name FROM boarding_houses WHERE id = ?', [houseId])
    const name = house[0]?.name || 'a boarding house you saved'
    for (const f of favs) {
      await insertNotification(
        f.user_id,
        'availability',
        'Room Availability Updated',
        `A room (${roomNo}) at ${name} has become available.`,
        `/houses/${houseId}`
      )
    }
  } catch (err) {
    console.error('Availability notify failed:', err.message)
  }
}

/** Turn a join of boarding_houses + room-count helpers into a public card. */
async function houseCardFromRow(h) {
  const [imgs] = await pool.query('SELECT image_url FROM house_images WHERE house_id = ? ORDER BY sort_order', [h.id])
  const [types] = await pool.query('SELECT DISTINCT type FROM rooms WHERE house_id = ?', [h.id])
  const totalRooms = Number(h.total_rooms_calc ?? h.total_rooms ?? 0)
  const occupiedRooms = Number(h.occupied_rooms_calc ?? h.occupied_rooms ?? 0)
  const vacant = Math.max(0, totalRooms - occupiedRooms)
  return {
    id: String(h.id),
    name: h.name,
    tagline: h.tagline || '',
    municipality: h.municipality,
    barangay: h.barangay,
    address: h.address,
    schoolNearby: typeof h.school_nearby === 'string' ? JSON.parse(h.school_nearby) : (h.school_nearby || []),
    images: imgs.map(i => i.image_url),
    description: h.description || '',
    rules: typeof h.rules === 'string' ? JSON.parse(h.rules) : (h.rules || []),
    visitorPolicy: h.visitor_policy || '',
    curfew: h.curfew || '',
    monthlyRent: h.monthly_rent,
    roomTypes: types.map(t => t.type),
    gender: h.gender,
    totalRooms,
    occupiedRooms,
    vacant,
    status: totalRooms === 0 ? 'available' : vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(totalRooms * 0.1)) ? 'almost-full' : 'available',
    wifi: !!h.wifi,
    aircon: !!h.aircon,
    kitchen: !!h.kitchen,
    laundry: !!h.laundry,
    parking: !!h.parking,
    petFriendly: !!h.pet_friendly,
    rating: parseFloat(h.rating) || 0,
    reviewsCount: h.reviews_count || 0,
    owner: h.owner_name || '',
    ownerInitials: h.owner_name ? h.owner_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '',
    ownerAvatarUrl: h.owner_avatar_url || '',
    landlordId: h.landlord_id ? String(h.landlord_id) : '',
    ownerUserId: h.owner_user_id ? String(h.owner_user_id) : '',
    verified: !!h.verified,
    topRated: !!h.top_rated,
    lat: parseFloat(h.lat) || 0,
    lng: parseFloat(h.lng) || 0,
    distanceFromSchool: h.distance_from_school || '',
    createdAt: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
  }
}

/** When an owner approves a reservation, give the boarder an active rental
 *  (and first rent record) so My Home can show a real accommodation. */
async function attachApprovedAccommodation(rs) {
  if (!rs.room_id) return false
  const [existing] = await pool.query(
    "SELECT id FROM boarder_rentals WHERE boarder_id = ? AND status IN ('active','notice','expiring')",
    [rs.boarder_id]
  )
  if (existing.length > 0) return false
  const [room] = await pool.query('SELECT capacity, occupied, monthly_rent FROM rooms WHERE id = ?', [rs.room_id])
  if (room.length === 0 || room[0].occupied >= room[0].capacity) return false

  const months = Number(rs.duration_months) > 0 ? Number(rs.duration_months) : 6
  const [rental] = await pool.query(
    `INSERT INTO boarder_rentals
      (boarder_id, room_id, house_id, move_in_date, contract_end, monthly_rent, deposit, advance, status)
     VALUES (?, ?, ?, ?, DATE_ADD(?, INTERVAL ? MONTH), ?, 0, 0, 'active')`,
    [rs.boarder_id, rs.room_id, rs.house_id, rs.move_in_date, rs.move_in_date, months, room[0].monthly_rent]
  )
  await pool.query('UPDATE rooms SET occupied = occupied + 1 WHERE id = ?', [rs.room_id])
  await pool.query('UPDATE boarding_houses SET occupied_rooms = occupied_rooms + 1 WHERE id = ?', [rs.house_id])

  const d = new Date(rs.move_in_date)
  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  await pool.query(
    'INSERT INTO payments (rental_id, month_key, label, amount, due_date, status) VALUES (?, ?, ?, ?, ?, "pending")',
    [rental.insertId, monthKey, label, room[0].monthly_rent, rs.move_in_date]
  )
  return true
}

/* ================================================================
   AUTH
   ================================================================ */

/** Turn the MySQL failures that make auth 500 into guidance the person at the
 *  sign-in form can act on, instead of a bare "Server error". */
function dbErrorMessage(err) {
  switch (err?.code) {
    case 'ECONNREFUSED':
      return 'Cannot reach MySQL. Start MySQL (XAMPP/WAMP or the MySQL service) and try again.'
    case 'ER_ACCESS_DENIED_ERROR':
      return 'MySQL rejected the database credentials. Set DB_USER / DB_PASSWORD in .env to match your MySQL user and restart the API server.'
    case 'ER_BAD_DB_ERROR':
      return 'The boardease database does not exist on this MySQL server. Import database/boardease.sql first, then try again.'
    case 'ER_BAD_FIELD_ERROR':
    case 'ER_NO_SUCH_TABLE':
      return 'The database schema is out of date. Import database/boardease.sql and database/boarder_avatar.sql, then restart the API server.'
    default:
      return 'Server error'
  }
}
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const cleanEmail = String(email).trim().toLowerCase()
    const [rows] = await pool.query(
      'SELECT u.id, u.email, u.name, u.role, u.avatar_color, u.avatar_url, u.phone, l.business_name AS property FROM users u LEFT JOIN landlords l ON l.user_id = u.id WHERE u.email = ? AND u.password = ?',
      [cleanEmail, password]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json({ ...rows[0], property: rows[0].property || '' })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: dbErrorMessage(err) })
  }
})

/* ================================================================
   SIGN UP (self-registration for boarders)
   ================================================================ */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Full name, email and password are required' })
    }
    if (!String(name).trim()) {
      return res.status(400).json({ error: 'Full name is required' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const cleanEmail = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    // Boarding-house owners are onboarded by BoardEase (they manage real
    // businesses and a subscription), so only boarder accounts self-register.
    if (role && role !== 'boarder') {
      return res.status(403).json({ error: 'Owner accounts are created by BoardEase administration. Please contact us to list your boarding house.' })
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })
    }

    const AVATAR_COLORS = ['#1E73E8', '#33C7A5', '#0B2D63', '#F59E0B', '#EF4444']
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role, name, phone, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanEmail, password, 'boarder', String(name).trim(), phone ? String(phone).trim() : null, avatarColor]
    )
    // Profile row so the new boarder appears correctly in every join.
    await pool.query('INSERT IGNORE INTO boarder_profiles (user_id) VALUES (?)', [result.insertId])

    res.json({
      id: result.insertId,
      email: cleanEmail,
      name: String(name).trim(),
      role: 'boarder',
      phone: phone ? String(phone).trim() : null,
      avatar_color: avatarColor,
      avatar_url: null,
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: dbErrorMessage(err) })
  }
})

/* ================================================================
   DELETE ACCOUNT (boarder self-service)
   ================================================================ */
app.delete('/api/auth/account', async (req, res) => {
  try {
    const { userId } = req.body || {}
    const id = parseInt(userId)
    if (!id) return res.status(400).json({ error: 'userId is required' })

    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found. Sign in and try again.' })
    }
    // Owner accounts hold live listings, boarders and rent records — they are
    // off-boarded by BoardEase administration instead of self-service.
    if (rows[0].role !== 'boarder') {
      return res.status(403).json({ error: 'Only boarder accounts can be deleted here.' })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      // Snapshot what is about to be removed so a receipt can be archived —
      // once the user row is gone, this data no longer exists anywhere.
      const [cRes] = await conn.query('SELECT COUNT(*) AS n FROM reservations WHERE boarder_id = ?', [id])
      const [cRent] = await conn.query('SELECT COUNT(*) AS n FROM boarder_rentals WHERE boarder_id = ?', [id])
      const [cRev] = await conn.query('SELECT COUNT(*) AS n FROM reviews WHERE boarder_id = ?', [id])
      const [cFav] = await conn.query('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?', [id])
      const [cMsg] = await conn.query(
        `SELECT COUNT(*) AS n FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.boarder_id = ?`,
        [id]
      )

      // Free up the beds this boarder still occupies so house availability
      // stays truthful after the account is gone.
      const [activeRentals] = await conn.query(
        "SELECT room_id, house_id FROM boarder_rentals WHERE boarder_id = ? AND status IN ('active','notice','expiring')",
        [id]
      )
      for (const r of activeRentals) {
        await conn.query('UPDATE rooms SET occupied = GREATEST(occupied - 1, 0) WHERE id = ?', [r.room_id])
        await conn.query('UPDATE boarding_houses SET occupied_rooms = GREATEST(occupied_rooms - 1, 0) WHERE id = ?', [r.house_id])
      }

      // Everything that hangs off the boarder id, then the account itself.
      // One transaction: a half-deleted account would be worse than none.
      await conn.query(
        `DELETE m FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.boarder_id = ?`,
        [id]
      )
      await conn.query('DELETE FROM conversations WHERE boarder_id = ?', [id])
      await conn.query(
        `DELETE p FROM payments p
         JOIN boarder_rentals br ON br.id = p.rental_id
         WHERE br.boarder_id = ?`,
        [id]
      )
      await conn.query('DELETE FROM boarder_rentals WHERE boarder_id = ?', [id])
      await conn.query('DELETE FROM reservations WHERE boarder_id = ?', [id])
      // Recompute the public rating of every house this boarder reviewed,
      // otherwise the deleted reviews would keep inflating the listing.
      const [reviewedHouses] = await conn.query('SELECT DISTINCT house_id FROM reviews WHERE boarder_id = ?', [id])
      await conn.query('DELETE FROM reviews WHERE boarder_id = ?', [id])
      for (const rh of reviewedHouses) {
        const [[agg]] = await conn.query(
          'SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS n FROM reviews WHERE house_id = ?',
          [rh.house_id]
        )
        await conn.query('UPDATE boarding_houses SET rating = ?, reviews_count = ? WHERE id = ?', [
          parseFloat(agg.avg_rating).toFixed(1),
          agg.n,
          rh.house_id,
        ])
      }
      await conn.query('DELETE FROM favorites WHERE user_id = ?', [id])
      // favorite_views is created on boot; an older database may not have it
      // yet. Its absence must not roll back the whole deletion.
      try {
        await conn.query('DELETE FROM favorite_views WHERE user_id = ?', [id])
      } catch (fvErr) {
        if (fvErr.code !== 'ER_NO_SUCH_TABLE') throw fvErr
      }
      await conn.query('DELETE FROM notifications WHERE user_id = ?', [id])
      await conn.query('DELETE FROM boarder_profiles WHERE user_id = ?', [id])
      await conn.query('DELETE FROM users WHERE id = ? AND role = "boarder"', [id])

      // Archive the deletion receipt — the permanent record of this request.
      // Its absence (older database) must not block the deletion itself.
      try {
        await conn.query(
          `INSERT INTO account_deletion_receipts
            (user_id, name, email, role, reservations_count, rentals_count, reviews_count, favorites_count, messages_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            rows[0].name || null,
            rows[0].email,
            rows[0].role,
            Number(cRes[0]?.n || 0),
            Number(cRent[0]?.n || 0),
            Number(cRev[0]?.n || 0),
            Number(cFav[0]?.n || 0),
            Number(cMsg[0]?.n || 0),
          ]
        )
      } catch (rcptErr) {
        if (rcptErr.code !== 'ER_NO_SUCH_TABLE') throw rcptErr
      }

      await conn.commit()

      // Notify every admin account for record-keeping — the deleted user can
      // no longer receive notifications themselves.
      try {
        const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'")
        const summary = `${rows[0].name || rows[0].email} (${rows[0].email}) deleted their boarder account. A deletion receipt was archived in the Admin console.`
        for (const a of admins) {
          await insertNotification(a.id, 'contract', 'Boarder account deleted', summary)
        }
      } catch (notifErr) {
        console.error('Admin deletion notification failed:', notifErr.message)
      }

      res.json({ ok: true })
    } catch (txErr) {
      await conn.rollback()
      throw txErr
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ error: dbErrorMessage(err) })
  }
})

/* ================================================================
   LANDLORD SIGN UP (self-registration with location & documents)
   ================================================================ */
app.post('/api/auth/landlord-register', async (req, res) => {
  try {
    const { email, password, fullName, mobileNumber, locationPref, locationLat, locationLng, documents } = req.body

    // --- Validation ---
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Full name, email and password are required' })
    }
    if (!String(fullName).trim()) {
      return res.status(400).json({ error: 'Full name is required' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const cleanEmail = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    if (!mobileNumber || String(mobileNumber).trim().length < 7) {
      return res.status(400).json({ error: 'A valid mobile number is required' })
    }
    if (!locationPref || String(locationPref).trim().length < 5) {
      return res.status(400).json({ error: 'Please select a location on the map' })
    }

    const ALLOWED_DOC_TYPES = new Set(['valid_id', 'business_permit', 'sec_registration', 'other', 'legal_documents'])
    const isImageDataUrl = (url) =>
      typeof url === 'string' && /^data:image\/(jpeg|jpg|png)/i.test(url.trim())

    const docs = Array.isArray(documents) ? documents : []
    const preparedDocs = docs.filter(
      (doc) =>
        doc &&
        ALLOWED_DOC_TYPES.has(String(doc.docType)) &&
        String(doc.docName || '').trim() &&
        isImageDataUrl(doc.docUrl)
    )
    const hasValidId = preparedDocs.some((d) => d.docType === 'valid_id')
    const hasLegalDocs = preparedDocs.some((d) => d.docType === 'legal_documents' || d.docType === 'other')
    if (!hasValidId || !hasLegalDocs) {
      return res.status(400).json({
        error: 'Valid ID and Documents are both required. Upload JPG, JPEG, or PNG files before submitting.',
      })
    }

    // --- Create the account ---
    // The user row, landlord profile and documents must land together. Running
    // them as separate statements meant a failure half-way through (say the
    // documents insert) still left the user row behind, so the next attempt was
    // rejected with "account already exists" for an account that never finished.
    const AVATAR_COLORS = ['#1E73E8', '#33C7A5', '#0B2D63', '#F59E0B', '#EF4444']
    let avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    // `landlords.location_pref` is varchar(255) and the address comes from a
    // reverse-geocode lookup, which can run long — trim it rather than let MySQL
    // reject the whole sign-up with "Data too long for column".
    const cleanLocationPref = String(locationPref).trim().slice(0, 255)
    const conn = await pool.getConnection()
    let userId
    let landlordId
    try {
      await conn.beginTransaction()

      const [existing] = await conn.query(
        `SELECT u.id, u.role, u.password, u.avatar_color, l.id AS landlord_id,
                (SELECT COUNT(DISTINCT d.doc_type) FROM landlord_documents d
                  WHERE d.landlord_id = l.id
                    AND d.doc_type IN ('valid_id', 'legal_documents')) AS required_doc_count
           FROM users u LEFT JOIN landlords l ON l.user_id = u.id
          WHERE u.email = ?`,
        [cleanEmail]
      )

      if (existing.length > 0) {
        const prev = existing[0]
        // An interrupted sign-up leaves the email behind without a usable
        // landlord account: either the landlord profile or one of the two
        // required documents never landed. Let that same person resume it
        // instead of stranding the address — the password must match, so nobody
        // else can claim it.
        const incompleteSignup =
          prev.role === 'landlord' &&
          (!prev.landlord_id || Number(prev.required_doc_count) < 2) &&
          prev.password === password

        if (!incompleteSignup) {
          await conn.rollback()
          return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })
        }

        userId = prev.id
        avatarColor = prev.avatar_color || avatarColor
        await conn.query(
          'UPDATE users SET name = ?, phone = ?, password = ? WHERE id = ?',
          [String(fullName).trim(), String(mobileNumber).trim(), password, userId]
        )
      } else {
        const [userResult] = await conn.query(
          'INSERT INTO users (email, password, role, name, phone, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
          [cleanEmail, password, 'landlord', String(fullName).trim(), String(mobileNumber).trim(), avatarColor]
        )
        userId = userResult.insertId
      }

      // --- Landlord profile with location preference ---
      if (existing.length > 0 && existing[0].landlord_id) {
        // Resuming an interrupted sign-up: reuse the profile row, refresh its
        // location, and clear the documents the failed attempt left behind so
        // the resubmitted ones are not stored twice.
        landlordId = existing[0].landlord_id
        await conn.query(
          'UPDATE landlords SET location_pref = ?, location_lat = ?, location_lng = ? WHERE id = ?',
          [cleanLocationPref,
           locationLat ? parseFloat(locationLat) : null,
           locationLng ? parseFloat(locationLng) : null,
           landlordId]
        )
        await conn.query('DELETE FROM landlord_documents WHERE landlord_id = ?', [landlordId])
      } else {
        const [landlordResult] = await conn.query(
          'INSERT INTO landlords (user_id, location_pref, location_lat, location_lng) VALUES (?, ?, ?, ?)',
          [userId, cleanLocationPref,
           locationLat ? parseFloat(locationLat) : null,
           locationLng ? parseFloat(locationLng) : null]
        )
        landlordId = landlordResult.insertId
      }

      // --- Store submitted documents (always includes required Valid ID + Documents) ---
      for (const doc of preparedDocs) {
        await conn.query(
          'INSERT INTO landlord_documents (landlord_id, doc_type, doc_name, doc_url) VALUES (?, ?, ?, ?)',
          [landlordId, doc.docType, String(doc.docName).trim(), String(doc.docUrl).trim()]
        )
      }

      await conn.commit()
    } catch (err) {
      await conn.rollback().catch(() => {})
      throw err
    } finally {
      conn.release()
    }

    res.json({
      id: userId,
      email: cleanEmail,
      name: String(fullName).trim(),
      role: 'landlord',
      phone: String(mobileNumber).trim(),
      avatar_color: avatarColor,
      avatar_url: null,
      landlordId,
      locationPref: cleanLocationPref,
      locationLat: locationLat ? parseFloat(locationLat) : null,
      locationLng: locationLng ? parseFloat(locationLng) : null,
    })
  } catch (err) {
    console.error('Landlord register error:', err)
    // A missing column/table is the usual reason landlord sign-up 500s on a
    // database that predates the landlord migrations — say so instead of a bare
    // "Server error", which sends people hunting through the wrong code.
    const schemaIssue = ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE', 'ER_NO_DEFAULT_FOR_FIELD', 'ER_BAD_NULL_ERROR'].includes(err.code)
    if (schemaIssue) {
      return res.status(500).json({
        error: 'The landlord database schema is incomplete. Run the SQL in database/boardease.sql and database/landlord_documents.sql, then restart the API server (npm run dev).',
      })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   HOUSES (Boarding Houses)
   ================================================================ */

/**
 * Public listings only surface houses whose landlord is on a paid plan.
 *
 * A landlord with no subscription still gets a fully editable listing in
 * "My Boarding House", but it stays a private draft: it never appears in
 * Explore, featured, locations or "similar houses". Written as an EXISTS
 * subquery so it works with or without a `landlords` join.
 */
const PUBLISHED_HOUSE_SQL =
  "EXISTS (SELECT 1 FROM landlords pl WHERE pl.id = bh.landlord_id AND COALESCE(pl.subscription, 'none') <> 'none')"

app.get('/api/houses', async (req, res) => {
  try {
    const {
      q, municipality, barangay, school, maxRent, gender,
      onlyAvailable, minRating, wifi, aircon, kitchen,
      laundry, parking, petFriendly, curfew, sort
    } = req.query
    // Room-type filter arrives as one or more `roomType` params (e.g. from
    // the landing page's Categories or the Hero quick-search).
    const roomTypes = req.query.roomType
      ? (Array.isArray(req.query.roomType) ? req.query.roomType : [req.query.roomType])
      : []

    let sql = `
      SELECT bh.*, l.business_name AS owner_name, l.verified AS owner_verified, u.avatar_url AS owner_avatar_url,
        (SELECT COALESCE(SUM(r.capacity), 0) FROM rooms r WHERE r.house_id = bh.id) AS total_rooms_calc,
        (SELECT COALESCE(SUM(r.occupied), 0) FROM rooms r WHERE r.house_id = bh.id) AS occupied_rooms_calc
      FROM boarding_houses bh
      LEFT JOIN landlords l ON l.id = bh.landlord_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE ${PUBLISHED_HOUSE_SQL}
    `
    const params = []

    // Free-text search over PUBLIC boarding-house information only.
    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`
      sql += ` AND (
        bh.name LIKE ? OR bh.address LIKE ? OR bh.barangay LIKE ? OR bh.municipality LIKE ?
        OR bh.description LIKE ? OR bh.tagline LIKE ?
        OR EXISTS (SELECT 1 FROM rooms sr WHERE sr.house_id = bh.id AND (sr.room_no LIKE ? OR sr.type LIKE ?))
      )`
      params.push(term, term, term, term, term, term, term, term)
      // Amenity keywords typed by the boarder map onto the real amenity flags.
      const text = String(q).toLowerCase()
      const amenityWords = [
        ['wifi', 'wifi'], ['wi-fi', 'wifi'],
        ['aircon', 'aircon'], ['air-condition', 'aircon'],
        ['kitchen', 'kitchen'], ['laundry', 'laundry'],
        ['parking', 'parking'], ['pet', 'pet_friendly'],
      ]
      for (const [word, col] of amenityWords) {
        if (text.includes(word)) sql += ` AND bh.${col} = TRUE`
      }
    }

    if (municipality) { sql += ' AND bh.municipality = ?'; params.push(municipality) }
    if (barangay) { sql += ' AND bh.barangay = ?'; params.push(barangay) }
    if (school) {
      sql += ' AND JSON_CONTAINS(bh.school_nearby, JSON_QUOTE(?))'
      params.push(school)
    }
    if (maxRent) { sql += ' AND bh.monthly_rent <= ?'; params.push(parseInt(maxRent)) }
    if (gender) { sql += ' AND (bh.gender = ? OR bh.gender = "mixed")'; params.push(gender) }
    if (roomTypes.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM rooms rt
        WHERE rt.house_id = bh.id AND rt.type IN (${roomTypes.map(() => '?').join(', ')})
      )`
      params.push(...roomTypes)
    }
    if (onlyAvailable === 'true') {
      sql += ' AND (bh.total_rooms - bh.occupied_rooms) > 0'
    }
    if (minRating) { sql += ' AND bh.rating >= ?'; params.push(parseFloat(minRating)) }
    if (wifi === 'true') { sql += ' AND bh.wifi = TRUE' }
    if (aircon === 'true') { sql += ' AND bh.aircon = TRUE' }
    if (kitchen === 'true') { sql += ' AND bh.kitchen = TRUE' }
    if (laundry === 'true') { sql += ' AND bh.laundry = TRUE' }
    if (parking === 'true') { sql += ' AND bh.parking = TRUE' }
    if (petFriendly === 'true') { sql += ' AND bh.pet_friendly = TRUE' }
    if (curfew === 'true') { sql += ' AND bh.curfew IS NOT NULL' }

    // Sort
    switch (sort) {
      case 'price-asc': sql += ' ORDER BY bh.monthly_rent ASC'; break
      case 'price-desc': sql += ' ORDER BY bh.monthly_rent DESC'; break
      case 'rating': sql += ' ORDER BY bh.rating DESC'; break
      case 'available': sql += ' ORDER BY (bh.total_rooms - bh.occupied_rooms) DESC'; break
      default: sql += ' ORDER BY bh.verified DESC, bh.rating DESC'; break
    }

    const [rows] = await pool.query(sql, params)

    // Enrich with images and room types
    const houses = await Promise.all(rows.map(async (h) => {
      const [imgs] = await pool.query('SELECT image_url FROM house_images WHERE house_id = ? ORDER BY sort_order', [h.id])
      const [types] = await pool.query('SELECT DISTINCT type FROM rooms WHERE house_id = ?', [h.id])
      const vacant = Math.max(0, h.total_rooms_calc - h.occupied_rooms_calc)
      return {
        id: String(h.id),
        name: h.name,
        tagline: h.tagline || '',
        municipality: h.municipality,
        barangay: h.barangay,
        address: h.address,
        schoolNearby: typeof h.school_nearby === 'string' ? JSON.parse(h.school_nearby) : (h.school_nearby || []),
        images: imgs.map(i => i.image_url),
        description: h.description || '',
        rules: typeof h.rules === 'string' ? JSON.parse(h.rules) : (h.rules || []),
        visitorPolicy: h.visitor_policy || '',
        curfew: h.curfew || '',
        monthlyRent: h.monthly_rent,
        roomTypes: types.map(t => t.type),
        gender: h.gender,
        totalRooms: h.total_rooms_calc,
        occupiedRooms: h.occupied_rooms_calc,
        vacant,
        // A listing with no rooms yet is brand new, not full — calling it "full"
        // hid it from the "only available" filter and read as a warning.
        status: h.total_rooms_calc === 0 ? 'available' : vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms_calc * 0.1)) ? 'almost-full' : 'available',
        wifi: !!h.wifi,
        aircon: !!h.aircon,
        kitchen: !!h.kitchen,
        laundry: !!h.laundry,
        parking: !!h.parking,
        petFriendly: !!h.pet_friendly,
        rating: parseFloat(h.rating) || 0,
        reviewsCount: h.reviews_count || 0,
        owner: h.owner_name || '',
        ownerInitials: h.owner_name ? h.owner_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '',
        ownerAvatarUrl: h.owner_avatar_url || '',
        verified: !!h.verified,
        topRated: !!h.top_rated,
        lat: parseFloat(h.lat) || 0,
        lng: parseFloat(h.lng) || 0,
        distanceFromSchool: h.distance_from_school || '',
        createdAt: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
      }
    }))

    res.json(houses)
  } catch (err) {
    console.error('Get houses error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/houses/featured', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT bh.* FROM boarding_houses bh WHERE ${PUBLISHED_HOUSE_SQL} ORDER BY bh.top_rated DESC, bh.rating DESC LIMIT 4`
    )
    const houses = await Promise.all(rows.map(async (h) => {
      const [imgs] = await pool.query('SELECT image_url FROM house_images WHERE house_id = ? ORDER BY sort_order', [h.id])
      const [types] = await pool.query('SELECT DISTINCT type FROM rooms WHERE house_id = ?', [h.id])
      const vacant = Math.max(0, h.total_rooms - h.occupied_rooms)
      return {
        id: String(h.id), name: h.name, tagline: h.tagline || '',
        municipality: h.municipality, barangay: h.barangay, address: h.address,
        schoolNearby: typeof h.school_nearby === 'string' ? JSON.parse(h.school_nearby) : (h.school_nearby || []),
        images: imgs.map(i => i.image_url),
        description: h.description || '',
        rules: typeof h.rules === 'string' ? JSON.parse(h.rules) : (h.rules || []),
        visitorPolicy: h.visitor_policy || '', curfew: h.curfew || '',
        monthlyRent: h.monthly_rent, roomTypes: types.map(t => t.type),
        gender: h.gender, totalRooms: h.total_rooms, occupiedRooms: h.occupied_rooms,
        vacant, status: Number(h.total_rooms) === 0 ? 'available' : vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms * 0.1)) ? 'almost-full' : 'available',
        wifi: !!h.wifi, aircon: !!h.aircon, kitchen: !!h.kitchen, laundry: !!h.laundry,
        parking: !!h.parking, petFriendly: !!h.pet_friendly,
        rating: parseFloat(h.rating) || 0, reviewsCount: h.reviews_count || 0,
        owner: '', ownerInitials: '',
        verified: !!h.verified, topRated: !!h.top_rated,
        lat: parseFloat(h.lat) || 0, lng: parseFloat(h.lng) || 0,
        distanceFromSchool: h.distance_from_school || '',
        createdAt: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
      }
    }))
    res.json(houses)
  } catch (err) {
    console.error('Get featured error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/houses/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT bh.*, l.business_name AS owner_name, l.user_id AS owner_user_id, u.avatar_url AS owner_avatar_url FROM boarding_houses bh LEFT JOIN landlords l ON l.id = bh.landlord_id LEFT JOIN users u ON u.id = l.user_id WHERE bh.id = ?',
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'House not found' })
    const h = rows[0]
    const [imgs] = await pool.query('SELECT image_url FROM house_images WHERE house_id = ? ORDER BY sort_order', [h.id])
    const [vids] = await pool.query('SELECT video_url, title FROM house_videos WHERE house_id = ? ORDER BY sort_order, id', [h.id])
    const [types] = await pool.query('SELECT DISTINCT type FROM rooms WHERE house_id = ?', [h.id])
    const vacant = Math.max(0, h.total_rooms - h.occupied_rooms)
    res.json({
      id: String(h.id), name: h.name, tagline: h.tagline || '',
      municipality: h.municipality, barangay: h.barangay, address: h.address,
      schoolNearby: typeof h.school_nearby === 'string' ? JSON.parse(h.school_nearby) : (h.school_nearby || []),
      images: imgs.map(i => i.image_url),
      videos: vids.map(v => ({ url: v.video_url, title: v.title || '' })),
      description: h.description || '',
      rules: typeof h.rules === 'string' ? JSON.parse(h.rules) : (h.rules || []),
      visitorPolicy: h.visitor_policy || '', curfew: h.curfew || '',
      monthlyRent: h.monthly_rent, roomTypes: types.map(t => t.type),
      gender: h.gender, totalRooms: h.total_rooms, occupiedRooms: h.occupied_rooms,
      vacant, status: Number(h.total_rooms) === 0 ? 'available' : vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms * 0.1)) ? 'almost-full' : 'available',
      wifi: !!h.wifi, aircon: !!h.aircon, kitchen: !!h.kitchen, laundry: !!h.laundry,
      parking: !!h.parking, petFriendly: !!h.pet_friendly,
      rating: parseFloat(h.rating) || 0, reviewsCount: h.reviews_count || 0,
      owner: h.owner_name || '', ownerInitials: h.owner_name ? h.owner_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '',
      ownerAvatarUrl: h.owner_avatar_url || '',
      landlordId: h.landlord_id ? String(h.landlord_id) : '',
      ownerUserId: h.owner_user_id ? String(h.owner_user_id) : '',
      verified: !!h.verified, topRated: !!h.top_rated,
      lat: parseFloat(h.lat) || 0, lng: parseFloat(h.lng) || 0,
      distanceFromSchool: h.distance_from_school || '',
      createdAt: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
    })
  } catch (err) {
    console.error('Get house error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   BOARDING HOUSE — PUBLIC ROOMS
   ================================================================ */
app.get('/api/houses/:id/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, room_no, type, capacity, occupied, monthly_rent, gender, aircon, photo, needs FROM rooms WHERE house_id = ? ORDER BY room_no',
      [req.params.id]
    )
    // Public room availability only — never exposes tenant names.
    res.json(rows.map(r => {
      const available = Math.max(0, r.capacity - r.occupied)
      return {
        id: String(r.id),
        roomNo: r.room_no,
        type: r.type,
        capacity: r.capacity,
        occupied: r.occupied,
        available,
        monthlyRent: r.monthly_rent,
        gender: r.gender,
        aircon: !!r.aircon,
        photo: r.photo || '',
        needs: (() => { try { return typeof r.needs === 'string' ? JSON.parse(r.needs) : (r.needs || []) } catch { return [] } })(),
        status: available > 0 ? 'available' : 'full',
      }
    }))
  } catch (err) {
    console.error('Get public rooms error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/houses/:id/similar', async (req, res) => {
  try {
    const [current] = await pool.query('SELECT municipality, monthly_rent FROM boarding_houses WHERE id = ?', [req.params.id])
    if (current.length === 0) return res.json([])
    const { municipality, monthly_rent } = current[0]
    const [rows] = await pool.query(
      `SELECT bh.* FROM boarding_houses bh
        WHERE bh.id != ? AND (bh.municipality = ? OR bh.monthly_rent <= ?) AND ${PUBLISHED_HOUSE_SQL}
        LIMIT 3`,
      [req.params.id, municipality, monthly_rent + 1000]
    )
    const houses = await Promise.all(rows.map(async (h) => {
      const [imgs] = await pool.query('SELECT image_url FROM house_images WHERE house_id = ? ORDER BY sort_order', [h.id])
      const [types] = await pool.query('SELECT DISTINCT type FROM rooms WHERE house_id = ?', [h.id])
      const vacant = Math.max(0, h.total_rooms - h.occupied_rooms)
      return {
        id: String(h.id), name: h.name, tagline: h.tagline || '',
        municipality: h.municipality, barangay: h.barangay, address: h.address,
        schoolNearby: typeof h.school_nearby === 'string' ? JSON.parse(h.school_nearby) : (h.school_nearby || []),
        images: imgs.map(i => i.image_url), description: h.description || '',
        rules: typeof h.rules === 'string' ? JSON.parse(h.rules) : (h.rules || []),
        visitorPolicy: h.visitor_policy || '', curfew: h.curfew || '',
        monthlyRent: h.monthly_rent, roomTypes: types.map(t => t.type),
        gender: h.gender, totalRooms: h.total_rooms, occupiedRooms: h.occupied_rooms,
        vacant, status: Number(h.total_rooms) === 0 ? 'available' : vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms * 0.1)) ? 'almost-full' : 'available',
        wifi: !!h.wifi, aircon: !!h.aircon, kitchen: !!h.kitchen, laundry: !!h.laundry,
        parking: !!h.parking, petFriendly: !!h.pet_friendly,
        rating: parseFloat(h.rating) || 0, reviewsCount: h.reviews_count || 0,
        owner: '', ownerInitials: '',
        verified: !!h.verified, topRated: !!h.top_rated,
        lat: parseFloat(h.lat) || 0, lng: parseFloat(h.lng) || 0,
        distanceFromSchool: h.distance_from_school || '',
        createdAt: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
      }
    }))
    res.json(houses)
  } catch (err) {
    console.error('Get similar error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   LOCATIONS
   ================================================================ */
app.get('/api/locations', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT bh.municipality,
        COUNT(*) AS count,
        (SELECT hi.image_url FROM house_images hi WHERE hi.house_id = bh.id ORDER BY hi.sort_order LIMIT 1) AS image,
        GROUP_CONCAT(DISTINCT bh.barangay) AS barangays
      FROM boarding_houses bh
      WHERE ${PUBLISHED_HOUSE_SQL}
      GROUP BY bh.municipality
      ORDER BY count DESC
    `)
    res.json(rows.map(r => ({
      municipality: r.municipality,
      count: r.count,
      image: r.image || '',
      barangays: r.barangays ? r.barangays.split(',') : [],
    })))
  } catch (err) {
    console.error('Get locations error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   MY BOARDING HOUSE (the signed-in landlord's own listing)
   ================================================================ */

/** Parse a JSON-ish column (`rules`, `school_nearby`) into a string array. */
function parseStringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : []
  } catch {
    return []
  }
}

const trimStr = (v, max) => (v == null ? '' : String(v).trim().slice(0, max))
const toFlag = (v) => (v ? 1 : 0)
const toJsonArray = (v) =>
  JSON.stringify((Array.isArray(v) ? v : []).map((x) => trimStr(x, 200)).filter(Boolean).slice(0, 30))

/** The `landlords` row (and the location picked at sign-up) behind a user. */
async function landlordForUser(userId) {
  if (!userId) return null
  const [rows] = await pool.query(
    'SELECT id, business_name, address, location_pref, location_lat, location_lng FROM landlords WHERE user_id = ?',
    [userId]
  )
  return rows[0] || null
}

/**
 * Resolve which house a landlord-scoped request is about.
 *
 * Returns the explicit `?houseId=`, otherwise the house owned by the landlord
 * behind `?userId=`. A landlord who has not set up a house yet resolves to `0`,
 * which matches no rows — that is deliberate: their console must show real
 * zeros rather than somebody else's boarding house (it used to fall back to the
 * seeded Sunset house, which made every new landlord look like the demo owner).
 * Returns `null` when neither is supplied so legacy callers keep their old
 * unscoped behaviour.
 */
async function resolveHouseId({ houseId, userId }) {
  if (houseId) return Number(houseId)
  if (userId) {
    const landlord = await landlordForUser(userId)
    if (!landlord) return 0
    const [rows] = await pool.query(
      'SELECT id FROM boarding_houses WHERE landlord_id = ? ORDER BY id LIMIT 1',
      [landlord.id]
    )
    return rows.length > 0 ? Number(rows[0].id) : 0
  }
  return null
}

/** Load a landlord's house (one per landlord) in the owner-facing shape. */
async function loadOwnerHouse(landlord) {
  const [houses] = await pool.query(
    'SELECT * FROM boarding_houses WHERE landlord_id = ? ORDER BY id LIMIT 1',
    [landlord.id]
  )
  if (houses.length === 0) return null
  const h = houses[0]
  const [images] = await pool.query(
    'SELECT id, image_url FROM house_images WHERE house_id = ? ORDER BY sort_order, id',
    [h.id]
  )
  const [videos] = await pool.query(
    'SELECT id, video_url, title FROM house_videos WHERE house_id = ? ORDER BY sort_order, id',
    [h.id]
  )
  const lat = h.lat != null ? Number(h.lat) : (landlord.location_lat != null ? Number(landlord.location_lat) : null)
  const lng = h.lng != null ? Number(h.lng) : (landlord.location_lng != null ? Number(landlord.location_lng) : null)
  return {
    id: String(h.id),
    landlordId: String(h.landlord_id),
    name: h.name || '',
    tagline: h.tagline || '',
    municipality: h.municipality || '',
    barangay: h.barangay || '',
    address: h.address || '',
    description: h.description || '',
    lat,
    lng,
    monthlyRent: Number(h.monthly_rent) || 0,
    curfew: h.curfew || '',
    visitorPolicy: h.visitor_policy || '',
    rules: parseStringArray(h.rules),
    schoolNearby: parseStringArray(h.school_nearby),
    distanceFromSchool: h.distance_from_school || '',
    wifi: !!h.wifi,
    aircon: !!h.aircon,
    kitchen: !!h.kitchen,
    laundry: !!h.laundry,
    parking: !!h.parking,
    petFriendly: !!h.pet_friendly,
    verified: !!h.verified,
    topRated: !!h.top_rated,
    rating: Number(h.rating) || 0,
    reviewsCount: Number(h.reviews_count) || 0,
    totalRooms: Number(h.total_rooms) || 0,
    occupiedRooms: Number(h.occupied_rooms) || 0,
    images: images.map((i) => ({ id: String(i.id), url: i.image_url })),
    videos: videos.map((v) => ({ id: String(v.id), url: v.video_url, title: v.title || '' })),
    createdAt: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
  }
}

const isHouseImageDataUrl = (url) =>
  typeof url === 'string' && /^data:image\/(jpeg|jpg|png|webp)/i.test(url.trim())

const isHouseVideoDataUrl = (url) =>
  typeof url === 'string' && /^data:video\/(mp4|webm|ogg|quicktime)/i.test(url.trim())

/** Load the landlord + their house, or answer 4xx and return null. */
async function ownerContextOrRespond(req, res, { needHouse }) {
  const userId = req.body?.userId || req.query?.userId
  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return null
  }
  const landlord = await landlordForUser(userId)
  if (!landlord) {
    res.status(404).json({ error: 'This account has no landlord profile. Complete landlord sign-up first.' })
    return null
  }
  if (!needHouse) return { landlord, houseId: null }
  const [houses] = await pool.query(
    'SELECT id FROM boarding_houses WHERE landlord_id = ? ORDER BY id LIMIT 1',
    [landlord.id]
  )
  if (houses.length === 0) {
    res.status(404).json({ error: 'Set up your boarding house first, then you can add photos.' })
    return null
  }
  return { landlord, houseId: Number(houses[0].id) }
}

// The signed-in landlord's house (plus the location chosen at sign-up).
app.get('/api/landlord/house', async (req, res) => {
  try {
    const landlord = await landlordForUser(req.query.userId)
    if (!landlord) return res.json({ house: null, landlord: null, suggested: null })
    const house = await loadOwnerHouse(landlord)
    res.json({
      house,
      landlord: {
        id: String(landlord.id),
        businessName: landlord.business_name || '',
        locationPref: landlord.location_pref || '',
        locationLat: landlord.location_lat != null ? Number(landlord.location_lat) : null,
        locationLng: landlord.location_lng != null ? Number(landlord.location_lng) : null,
      },
      // Prefill for the create form — reuses the map location from sign-up.
      suggested: {
        address: landlord.location_pref || '',
        municipality: (landlord.address || '').split(',')[0]?.trim() || '',
        lat: landlord.location_lat != null ? Number(landlord.location_lat) : null,
        lng: landlord.location_lng != null ? Number(landlord.location_lng) : null,
      },
    })
  } catch (err) {
    console.error('Get landlord house error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create or update the listing. Everything the Explore page shows lives here.
app.put('/api/landlord/house', async (req, res) => {
  try {
    const landlord = await landlordForUser(req.body.userId)
    if (!landlord) {
      return res.status(404).json({ error: 'This account has no landlord profile. Complete landlord sign-up first.' })
    }

    const name = trimStr(req.body.name, 255)
    const municipality = trimStr(req.body.municipality, 100)
    const barangay = trimStr(req.body.barangay, 100)
    const address = trimStr(req.body.address, 500)
    if (!name) return res.status(400).json({ error: 'Boarding house name is required' })
    if (!municipality) return res.status(400).json({ error: 'Municipality is required' })
    if (!barangay) return res.status(400).json({ error: 'Barangay is required' })
    if (!address) return res.status(400).json({ error: 'Street address is required' })

    const lat = req.body.lat === null || req.body.lat === '' || req.body.lat === undefined ? null : Number(req.body.lat)
    const lng = req.body.lng === null || req.body.lng === '' || req.body.lng === undefined ? null : Number(req.body.lng)

    const values = [
      name,
      trimStr(req.body.tagline, 500),
      municipality,
      barangay,
      address,
      trimStr(req.body.description, 4000),
      Number.isFinite(lat) ? lat : null,
      Number.isFinite(lng) ? lng : null,
      Math.max(0, Math.round(Number(req.body.monthlyRent) || 0)),
      trimStr(req.body.curfew, 20),
      trimStr(req.body.visitorPolicy, 2000),
      toJsonArray(req.body.rules),
      toJsonArray(req.body.schoolNearby),
      trimStr(req.body.distanceFromSchool, 100),
      toFlag(req.body.wifi),
      toFlag(req.body.aircon),
      toFlag(req.body.kitchen),
      toFlag(req.body.laundry),
      toFlag(req.body.parking),
      toFlag(req.body.petFriendly),
    ]

    const [existing] = await pool.query(
      'SELECT id FROM boarding_houses WHERE landlord_id = ? ORDER BY id LIMIT 1',
      [landlord.id]
    )

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO boarding_houses
          (landlord_id, name, tagline, municipality, barangay, address, description,
           lat, lng, monthly_rent, curfew, visitor_policy, rules, school_nearby,
           distance_from_school, wifi, aircon, kitchen, laundry, parking, pet_friendly)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [landlord.id, ...values]
      )
      // Keep the landlord's business name in sync so admin lists show it too.
      await pool.query('UPDATE landlords SET business_name = ? WHERE id = ? AND (business_name IS NULL OR business_name = \'\')', [name, landlord.id])
    } else {
      await pool.query(
        `UPDATE boarding_houses SET
           name = ?, tagline = ?, municipality = ?, barangay = ?, address = ?, description = ?,
           lat = ?, lng = ?, monthly_rent = ?, curfew = ?, visitor_policy = ?, rules = ?,
           school_nearby = ?, distance_from_school = ?, wifi = ?, aircon = ?, kitchen = ?,
           laundry = ?, parking = ?, pet_friendly = ?
         WHERE id = ?`,
        [...values, existing[0].id]
      )
    }

    res.json({ house: await loadOwnerHouse(landlord) })
  } catch (err) {
    console.error('Save landlord house error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Add photos to the gallery.
app.post('/api/landlord/house/images', async (req, res) => {
  try {
    const ctx = await ownerContextOrRespond(req, res, { needHouse: true })
    if (!ctx) return

    const incoming = (Array.isArray(req.body.images) ? req.body.images : [req.body.images]).filter(isHouseImageDataUrl)
    if (incoming.length === 0) {
      return res.status(400).json({ error: 'Upload JPG, JPEG, PNG, or WebP images.' })
    }
    if (incoming.some((url) => url.length > 8 * 1024 * 1024)) {
      return res.status(400).json({ error: 'Each photo must be 4 MB or smaller.' })
    }

    const [maxRow] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS highest FROM house_images WHERE house_id = ?',
      [ctx.houseId]
    )
    let order = Number(maxRow[0].highest) + 1
    for (const url of incoming) {
      await pool.query(
        'INSERT INTO house_images (house_id, image_url, sort_order) VALUES (?, ?, ?)',
        [ctx.houseId, url.trim(), order++]
      )
    }

    res.json({ house: await loadOwnerHouse(ctx.landlord) })
  } catch (err) {
    console.error('Add house images error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Reorder the gallery — the first photo is the listing cover.
app.put('/api/landlord/house/images', async (req, res) => {
  try {
    const ctx = await ownerContextOrRespond(req, res, { needHouse: true })
    if (!ctx) return

    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map(String)
    if (ids.length === 0) return res.status(400).json({ error: 'ids is required' })

    const [owned] = await pool.query('SELECT id FROM house_images WHERE house_id = ?', [ctx.houseId])
    const ownedIds = new Set(owned.map((row) => String(row.id)))
    if (ids.some((id) => !ownedIds.has(id))) {
      return res.status(403).json({ error: 'One of those photos does not belong to your boarding house.' })
    }

    for (const [index, id] of ids.entries()) {
      await pool.query('UPDATE house_images SET sort_order = ? WHERE id = ? AND house_id = ?', [index, id, ctx.houseId])
    }

    res.json({ house: await loadOwnerHouse(ctx.landlord) })
  } catch (err) {
    console.error('Reorder house images error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Replace one photo in place (e.g. after a renovation) — same gallery slot,
// same order, same cover status.
app.put('/api/landlord/house/images/:id', async (req, res) => {
  try {
    const ctx = await ownerContextOrRespond(req, res, { needHouse: true })
    if (!ctx) return

    const image = req.body.image
    if (!isHouseImageDataUrl(image)) {
      return res.status(400).json({ error: 'Upload a JPG, JPEG, PNG, or WebP image.' })
    }
    if (image.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'That photo must be 8 MB or smaller.' })
    }

    const [result] = await pool.query('UPDATE house_images SET image_url = ? WHERE id = ? AND house_id = ?', [
      String(image).trim(),
      req.params.id,
      ctx.houseId,
    ])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'That photo is not part of your boarding house.' })
    }

    res.json({ house: await loadOwnerHouse(ctx.landlord) })
  } catch (err) {
    console.error('Replace house image error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Remove a photo.
app.delete('/api/landlord/house/images/:id', async (req, res) => {
  try {
    const ctx = await ownerContextOrRespond(req, res, { needHouse: true })
    if (!ctx) return

    const [result] = await pool.query(
      'DELETE FROM house_images WHERE id = ? AND house_id = ?',
      [req.params.id, ctx.houseId]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'That photo is not part of your boarding house.' })
    }

    res.json({ house: await loadOwnerHouse(ctx.landlord) })
  } catch (err) {
    console.error('Delete house image error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ----------------------------------------------------------------
   HOUSE VIDEOS — short walkthrough clips shown with the photos.
   Same owner-scoped pattern as the image endpoints.
   ---------------------------------------------------------------- */
app.post('/api/landlord/house/videos', async (req, res) => {
  try {
    const ctx = await ownerContextOrRespond(req, res, { needHouse: true })
    if (!ctx) return

    const incoming = (Array.isArray(req.body.videos) ? req.body.videos : [req.body.videos]).filter(
      (v) => v && isHouseVideoDataUrl(v.dataUrl)
    )
    if (incoming.length === 0) {
      return res.status(400).json({ error: 'Upload MP4, WebM, OGG, or MOV videos.' })
    }
    if (incoming.some((v) => v.dataUrl.length > 64 * 1024 * 1024)) {
      return res.status(400).json({ error: 'Each video must be 48 MB or smaller.' })
    }

    const [maxRow] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS highest FROM house_videos WHERE house_id = ?',
      [ctx.houseId]
    )
    let order = Number(maxRow[0].highest) + 1
    for (const v of incoming) {
      await pool.query(
        'INSERT INTO house_videos (house_id, video_url, title, sort_order) VALUES (?, ?, ?, ?)',
        [ctx.houseId, v.dataUrl.trim(), trimStr(v.title, 120), order++]
      )
    }

    res.json({ house: await loadOwnerHouse(ctx.landlord) })
  } catch (err) {
    console.error('Add house videos error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Rename one video (title lives in the request body).
app.put('/api/landlord/house/videos/:id', async (req, res) => {
  try {
    const ctx = await ownerContextOrRespond(req, res, { needHouse: true })
    if (!ctx) return

    const [result] = await pool.query('UPDATE house_videos SET title = ? WHERE id = ? AND house_id = ?', [
      trimStr(req.body.title, 120),
      req.params.id,
      ctx.houseId,
    ])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'That video is not part of your boarding house.' })
    }

    res.json({ house: await loadOwnerHouse(ctx.landlord) })
  } catch (err) {
    console.error('Update house video error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Remove one video.
app.delete('/api/landlord/house/videos/:id', async (req, res) => {
  try {
    const ctx = await ownerContextOrRespond(req, res, { needHouse: true })
    if (!ctx) return

    const [result] = await pool.query('DELETE FROM house_videos WHERE id = ? AND house_id = ?', [
      req.params.id,
      ctx.houseId,
    ])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'That video is not part of your boarding house.' })
    }

    res.json({ house: await loadOwnerHouse(ctx.landlord) })
  } catch (err) {
    console.error('Delete house video error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   ROOMS
   ================================================================ */
app.get('/api/rooms', async (req, res) => {
  try {
    const hid = await resolveHouseId(req.query)
    let sql = `
      SELECT r.*,
        (SELECT GROUP_CONCAT(u.name SEPARATOR ',') FROM boarder_rentals br
         JOIN users u ON u.id = br.boarder_id
         WHERE br.room_id = r.id AND br.status = 'active') AS tenant_names
      FROM rooms r
    `
    const params = []
    if (hid !== null) { sql += ' WHERE r.house_id = ?'; params.push(hid) }
    sql += ' ORDER BY r.room_no'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(r => ({
      id: String(r.id),
      houseId: String(r.house_id),
      roomNo: r.room_no,
      type: r.type,
      capacity: r.capacity,
      occupied: r.occupied,
      monthlyRent: r.monthly_rent,
      gender: r.gender,
      aircon: !!r.aircon,
      photo: r.photo || '',
      needs: (() => { try { return typeof r.needs === 'string' ? JSON.parse(r.needs) : (r.needs || []) } catch { return [] } })(),
      tenantIds: [],
      tenantNames: r.tenant_names ? r.tenant_names.split(',') : [],
    })))
  } catch (err) {
    console.error('Get rooms error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/rooms', async (req, res) => {
  try {
    const { roomNo, type, capacity, monthlyRent, gender, aircon, photo, needs } = req.body
    // The Rooms page never sent a house id, so this used to insert NULL into a
    // NOT NULL column and fail with a 500. Resolve it from the body, or from
    // the signed-in landlord's own boarding house.
    const houseId = await resolveHouseId({ houseId: req.body.houseId, userId: req.body.userId })
    if (!houseId) {
      return res.status(400).json({ error: 'Set up your boarding house before adding rooms.' })
    }
    const [result] = await pool.query(
      'INSERT INTO rooms (house_id, room_no, type, capacity, monthly_rent, gender, aircon, photo, needs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [houseId, roomNo, type, capacity || 1, monthlyRent, gender || 'mixed', aircon || false, trimStr(photo, 8000000), JSON.stringify(toJsonArray(needs))]
    )
    // Update house total rooms
    await pool.query(
      'UPDATE boarding_houses SET total_rooms = total_rooms + ? WHERE id = ?',
      [capacity || 1, houseId]
    )
    // A newly-added room is free — let boarders who saved this house know.
    if ((capacity || 1) > 0) await notifyAvailability(houseId, roomNo)
    res.json({ id: String(result.insertId), houseId, roomNo, type, capacity: capacity || 1, occupied: 0, monthlyRent, gender: gender || 'mixed', aircon: !!aircon, tenantIds: [] })
  } catch (err) {
    console.error('Add room error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { roomNo, type, capacity, monthlyRent, gender, aircon, photo, needs } = req.body
    const fields = []
    const params = []
    if (roomNo !== undefined) { fields.push('room_no = ?'); params.push(roomNo) }
    if (type !== undefined) { fields.push('type = ?'); params.push(type) }
    if (capacity !== undefined) { fields.push('capacity = ?'); params.push(capacity) }
    if (monthlyRent !== undefined) { fields.push('monthly_rent = ?'); params.push(monthlyRent) }
    if (gender !== undefined) { fields.push('gender = ?'); params.push(gender) }
    if (aircon !== undefined) { fields.push('aircon = ?'); params.push(aircon) }
    if (photo !== undefined) { fields.push('photo = ?'); params.push(trimStr(photo, 8000000)) }
    if (needs !== undefined) { fields.push('needs = ?'); params.push(JSON.stringify(toJsonArray(needs))) }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' })
    params.push(req.params.id)
    await pool.query(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, params)
    const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' })
    const r = rows[0]
    if (Number(r.capacity) > Number(r.occupied)) await notifyAvailability(r.house_id, r.room_no)
    res.json({ id: String(r.id), houseId: String(r.house_id), roomNo: r.room_no, type: r.type, capacity: r.capacity, occupied: r.occupied, monthlyRent: r.monthly_rent, gender: r.gender, aircon: !!r.aircon, photo: r.photo || '', needs: (() => { try { return typeof r.needs === 'string' ? JSON.parse(r.needs) : (r.needs || []) } catch { return [] } })(), tenantIds: [] })
  } catch (err) {
    console.error('Update room error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const [room] = await pool.query('SELECT * FROM rooms WHERE id = ?', [req.params.id])
    if (room.length === 0) return res.status(404).json({ error: 'Room not found' })
    await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id])
    await pool.query('UPDATE boarding_houses SET total_rooms = GREATEST(0, total_rooms - ?) WHERE id = ?', [room[0].capacity, room[0].house_id])
    res.json({ success: true })
  } catch (err) {
    console.error('Delete room error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   BOARDERS
   ================================================================ */
app.get('/api/boarders', async (req, res) => {
  try {
    const { q, gender, roomId } = req.query
    const hid = await resolveHouseId(req.query)
    let sql = `
      SELECT u.id, u.name, u.avatar_color, u.avatar_url, u.phone, bp.age, bp.gender AS gender_val,
        bp.school, bp.course, bp.guardian_name, bp.address,
        br.room_id, br.house_id, r.room_no,
        br.move_in_date, br.contract_end, br.monthly_rent, br.deposit, br.advance,
        br.status AS rental_status, br.notes
      FROM users u
      JOIN boarder_profiles bp ON bp.user_id = u.id
      LEFT JOIN boarder_rentals br ON br.boarder_id = u.id AND br.status = 'active'
      LEFT JOIN rooms r ON r.id = br.room_id
      WHERE u.role = 'boarder'
    `
    const params = []
    if (q) { sql += ' AND (u.name LIKE ? OR bp.school LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }
    if (gender) { sql += ' AND bp.gender = ?'; params.push(gender) }
    if (roomId) { sql += ' AND br.room_id = ?'; params.push(roomId) }
    if (hid !== null) { sql += ' AND br.house_id = ?'; params.push(hid) }
    sql += ' ORDER BY u.name'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(r => ({
      id: String(r.id),
      houseId: r.house_id ? String(r.house_id) : '',
      roomId: r.room_id ? String(r.room_id) : '',
      name: r.name,
      avatarColor: r.avatar_color || '#1E73E8',
      avatarUrl: r.avatar_url || '',
      age: r.age || 0,
      gender: r.gender_val || 'female',
      school: r.school || '',
      course: r.course || '',
      phone: r.phone || '',
      guardian: r.guardian_name || '',
      address: r.address || '',
      moveInDate: r.move_in_date ? new Date(r.move_in_date).toISOString().slice(0, 10) : '',
      contractEnd: r.contract_end ? new Date(r.contract_end).toISOString().slice(0, 10) : '',
      monthlyRent: r.monthly_rent || 0,
      deposit: r.deposit || 0,
      advance: r.advance || 0,
      status: r.rental_status || 'active',
      notes: r.notes || '',
    })))
  } catch (err) {
    console.error('Get boarders error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   PAYMENTS
   ================================================================ */
app.get('/api/payments', async (req, res) => {
  try {
    const { status, month, q } = req.query
    const hid = await resolveHouseId(req.query)
    let sql = `
      SELECT p.*, br.house_id, u.name AS boarder_name, r.room_no
      FROM payments p
      JOIN boarder_rentals br ON br.id = p.rental_id
      JOIN users u ON u.id = br.boarder_id
      LEFT JOIN rooms r ON r.id = br.room_id
      WHERE 1=1
    `
    const params = []
    if (hid !== null) { sql += ' AND br.house_id = ?'; params.push(hid) }
    if (status) { sql += ' AND p.status = ?'; params.push(status) }
    if (month) { sql += ' AND p.month_key = ?'; params.push(month) }
    if (q) {
      sql += ' AND (u.name LIKE ? OR r.room_no LIKE ?)'
      params.push(`%${q}%`, `%${q}%`)
    }
    sql += ' ORDER BY p.due_date DESC'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(r => ({
      id: String(r.id),
      boarderId: String(r.rental_id),
      roomId: r.room_no ? String(r.room_id) : '',
      houseId: r.house_id ? String(r.house_id) : '',
      boarderName: r.boarder_name || '—',
      roomNo: r.room_no || '—',
      month: r.month_key,
      label: r.label,
      amount: r.amount,
      dueDate: new Date(r.due_date).toISOString().slice(0, 10),
      paidDate: r.paid_date ? new Date(r.paid_date).toISOString().slice(0, 10) : null,
      status: r.status,
      method: r.method,
      reference: r.reference,
    })))
  } catch (err) {
    console.error('Get payments error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/payments/months', async (req, res) => {
  try {
    const hid = await resolveHouseId(req.query)
    let sql = `SELECT DISTINCT p.month_key FROM payments p
      JOIN boarder_rentals br ON br.id = p.rental_id
      WHERE 1=1`
    const params = []
    if (hid !== null) { sql += ' AND br.house_id = ?'; params.push(hid) }
    sql += ' ORDER BY p.month_key DESC'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(r => r.month_key))
  } catch (err) {
    console.error('Get payment months error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/payments/:id/pay', async (req, res) => {
  try {
    const { method } = req.body
    const prefix = method === 'GCash' ? 'GC' : method === 'PayLink' ? 'PL' : 'RC'
    const ref = `${prefix}-${Math.floor(100000 + Math.random() * 899999)}`
    await pool.query(
      'UPDATE payments SET status = "paid", paid_date = CURDATE(), method = ?, reference = ? WHERE id = ?',
      [method, ref, req.params.id]
    )
    const [rows] = await pool.query(`
      SELECT p.*, u.name AS boarder_name, r.room_no
      FROM payments p
      JOIN boarder_rentals br ON br.id = p.rental_id
      JOIN users u ON u.id = br.boarder_id
      LEFT JOIN rooms r ON r.id = br.room_id
      WHERE p.id = ?
    `, [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Payment not found' })
    const r = rows[0]
    res.json({
      id: String(r.id), boarderId: String(r.rental_id), roomId: String(r.room_id || ''),
      houseId: '', boarderName: r.boarder_name, roomNo: r.room_no || '—',
      month: r.month_key, label: r.label, amount: r.amount,
      dueDate: new Date(r.due_date).toISOString().slice(0, 10),
      paidDate: r.paid_date ? new Date(r.paid_date).toISOString().slice(0, 10) : null,
      status: r.status, method: r.method, reference: r.reference,
    })
  } catch (err) {
    console.error('Pay error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   REVIEWS
   ================================================================ */
app.get('/api/reviews', async (req, res) => {
  try {
    const { houseId } = req.query
    let sql = `
      SELECT rv.*, u.name AS author_name, u.avatar_color, u.avatar_url
      FROM reviews rv
      JOIN users u ON u.id = rv.boarder_id
      WHERE 1=1
    `
    const params = []
    if (houseId) { sql += ' AND rv.house_id = ?'; params.push(houseId) }
    sql += ' ORDER BY rv.created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(r => ({
      id: String(r.id),
      houseId: String(r.house_id),
      author: r.author_name || 'Anonymous',
      avatarColor: r.avatar_color || '#1E73E8',
      avatarUrl: r.avatar_url || '',
      rating: parseFloat(r.rating) || 0,
      categories: {
        cleanliness: r.cleanliness || 5,
        safety: r.safety || 5,
        comfort: r.comfort || 5,
        internet: r.internet || 5,
        owner: r.owner_rating || 5,
        location: r.location || 5,
        value: r.value_rating || 5,
      },
      comment: r.comment || '',
      date: new Date(r.created_at).toISOString().slice(0, 10),
      reply: r.reply || undefined,
    })))
  } catch (err) {
    console.error('Get reviews error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   NOTIFICATIONS
   ================================================================ */
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query
    let sql = 'SELECT * FROM notifications'
    const params = []
    if (userId) { sql += ' WHERE user_id = ?'; params.push(userId) }
    sql += ' ORDER BY created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(r => ({
      id: String(r.id),
      type: r.type,
      title: r.title,
      message: r.message,
      link: r.link || null,
      date: r.created_at ? new Date(r.created_at).toISOString() : '',
      read: !!r.is_read,
    })))
  } catch (err) {
    console.error('Get notifications error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/notifications/read', async (req, res) => {
  try {
    const { userId } = req.body
    if (userId) {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId])
    } else {
      await pool.query('UPDATE notifications SET is_read = TRUE')
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Mark read error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   DASHBOARD OVERVIEW
   ================================================================ */
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    // Scope to the requesting landlord's own house. A landlord who has not set
    // one up yet resolves to 0 and honestly sees zeros — the old `|| 1` fallback
    // made every new landlord look at the seeded Sunset house's numbers.
    const resolved = await resolveHouseId(req.query)
    const hid = resolved === null ? 1 : resolved

    // Room stats
    const [roomStats] = await pool.query(
      'SELECT COALESCE(SUM(capacity), 0) AS total, COALESCE(SUM(occupied), 0) AS occupied FROM rooms WHERE house_id = ?',
      [hid]
    )
    const total = Number(roomStats[0].total)
    const occupied = Number(roomStats[0].occupied)
    const vacant = total - occupied

    // Payment stats for current month
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    // Payments are attributed to a house through the boarder's rental, so this
    // has to join rather than filter `payments` directly. Every column is
    // qualified because both tables carry a `status` column.
    const [payStats] = await pool.query(`
      SELECT
        SUM(CASE WHEN p.status IN ('paid','late') THEN p.amount ELSE 0 END) AS collected,
        SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) AS pending_amount,
        SUM(CASE WHEN p.status = 'overdue' THEN p.amount ELSE 0 END) AS overdue_amount,
        SUM(CASE WHEN p.status IN ('pending','overdue') THEN 1 ELSE 0 END) AS overdue_count,
        COUNT(*) AS total_payments,
        SUM(CASE WHEN p.status IN ('paid','late') THEN 1 ELSE 0 END) AS paid_count,
        SUM(p.amount) AS expected
      FROM payments p
      JOIN boarder_rentals br ON br.id = p.rental_id
      WHERE p.month_key = ? AND br.house_id = ?
    `, [monthKey, hid])
    const ps = payStats[0]

    // Boarder counts
    const [bCount] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM boarder_rentals WHERE house_id = ? AND status = "active"',
      [hid]
    )

    // Room status for dashboard
    const [roomStatuses] = await pool.query(`
      SELECT r.room_no, r.type, r.occupied, r.capacity, r.monthly_rent, r.aircon,
        (SELECT GROUP_CONCAT(u.name SEPARATOR ',') FROM boarder_rentals br JOIN users u ON u.id = br.boarder_id WHERE br.room_id = r.id AND br.status = 'active') AS tenant_names
      FROM rooms r WHERE r.house_id = ?
    `, [hid])

    // Revenue trend (last 8 months)
    const [revenueTrend] = await pool.query(`
      SELECT p.month_key AS name,
        SUM(CASE WHEN p.status IN ('paid','late') THEN p.amount ELSE 0 END) AS income,
        SUM(p.amount) AS expected
      FROM payments p
      JOIN boarder_rentals br ON br.id = p.rental_id
      WHERE br.house_id = ?
      GROUP BY p.month_key ORDER BY p.month_key
    `, [hid])

    // Occupancy trend
    const occupancyTrend = revenueTrend.map((r, i) => ({
      name: r.name,
      occupancy: total > 0 ? Math.round((occupied / total) * 100 - (1 - i / Math.max(1, revenueTrend.length - 1)) * 14) : 0,
    }))

    res.json({
      totalRooms: total,
      occupiedRooms: occupied,
      vacantRooms: vacant,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      monthlyIncome: Number(ps.collected) || 0,
      expectedIncome: Number(ps.expected) || 0,
      lateCount: Number(ps.overdue_count) || 0,
      paidThisMonth: Number(ps.paid_count) || 0,
      pendingAmount: Number(ps.pending_amount) || 0,
      expiringContracts: 0,
      newBoardersThisMonth: 0,
      boarderCount: Number(bCount[0].cnt),
      genderSplit: { male: 0, female: 0 },
      revenueTrend: revenueTrend.map(r => ({ name: r.name, income: r.income || 0, expected: r.expected || 0 })),
      occupancyTrend,
      roomStatus: roomStatuses.map(r => ({
        roomNo: r.room_no, type: r.type, occupied: r.occupied, capacity: r.capacity,
        monthlyRent: r.monthly_rent, aircon: !!r.aircon,
        tenantNames: r.tenant_names ? r.tenant_names.split(',') : [],
      })),
    })
  } catch (err) {
    console.error('Dashboard overview error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   SUBSCRIPTION
   ================================================================ */
app.get('/api/subscription', async (req, res) => {
  try {
    const { userId } = req.query
    if (userId) {
      const [rows] = await pool.query('SELECT subscription FROM landlords WHERE user_id = ?', [userId])
      if (rows.length > 0) {
        const plan = rows[0].subscription || 'none'
        const planDetails = {
          none: { plan: 'None', price: 0, cycle: 'month', status: 'active', renewsOn: '', boarderLimit: 0, features: [] },
          basic: { plan: 'Basic', price: 199, cycle: 'month', status: 'active', renewsOn: '', boarderLimit: 5, features: ['Manage up to 5 boards', 'AI Assistant', 'Real-time notifications', 'Basic dashboard', 'Analytics', 'Data backup', 'Basic reports'] },
          standard: { plan: 'Standard', price: 499, cycle: 'month', status: 'active', renewsOn: '', boarderLimit: 15, features: ['Manage up to 15 boards', 'AI Assistant', 'Real-time notifications', 'Enhanced dashboard', 'Analytics', 'Data backup', 'Detailed reports'] },
          premium: { plan: 'Premium', price: 899, cycle: 'month', status: 'active', renewsOn: '', boarderLimit: 30, features: ['Manage up to 30 boards', 'AI Assistant', 'Real-time notifications', 'Advanced dashboard', 'Advanced analytics', 'Data backup', 'Advanced reports', 'Priority support', 'Enhanced management controls'] },
        }
        return res.json(planDetails[plan] || planDetails.none)
      }
    }
    // Default — no userId, return no plan
    res.json({
      plan: 'None', price: 0, cycle: 'month', status: 'active',
      renewsOn: '', boarderLimit: 0,
      features: [],
    })
  } catch (err) {
    console.error('Get subscription error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   BOARDER — MY ACCOMMODATION (derived from an active rental)
   ================================================================ */
app.get('/api/boarder/accommodation', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(`
      SELECT br.id AS rental_id, br.move_in_date, br.contract_end, br.monthly_rent,
             br.deposit, br.advance, br.status AS rental_status, br.notes,
             r.id AS room_id, r.room_no, r.type AS room_type, r.gender, r.capacity,
             bh.id AS house_id, bh.name AS house_name, bh.address, bh.municipality, bh.barangay,
             bh.curfew, bh.visitor_policy, bh.description, bh.lat, bh.lng,
             bh.wifi, bh.aircon AS house_aircon, bh.kitchen, bh.laundry, bh.parking, bh.pet_friendly,
             u.name AS owner_name, u.phone AS owner_phone
      FROM boarder_rentals br
      JOIN rooms r ON r.id = br.room_id
      JOIN boarding_houses bh ON bh.id = br.house_id
      LEFT JOIN landlords l ON l.id = bh.landlord_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE br.boarder_id = ? AND br.status IN ('active','notice','expiring')
      ORDER BY br.move_in_date DESC
      LIMIT 1
    `, [userId])
    if (rows.length === 0) return res.json(null)
    const a = rows[0]
    const [pays] = await pool.query(
      'SELECT month_key, label, amount, due_date, status FROM payments WHERE rental_id = ? ORDER BY due_date ASC',
      [a.rental_id]
    )
    const upcoming = pays.find(p => p.status === 'pending' || p.status === 'overdue' || p.status === 'late') || null
    res.json({
      rentalId: String(a.rental_id),
      houseId: String(a.house_id),
      houseName: a.house_name,
      address: a.address || '',
      municipality: a.municipality || '',
      barangay: a.barangay || '',
      roomId: String(a.room_id),
      roomNo: a.room_no,
      roomType: a.room_type,
      roomGender: a.gender,
      roomCapacity: a.capacity,
      monthlyRent: a.monthly_rent,
      deposit: a.deposit || 0,
      advance: a.advance || 0,
      moveInDate: a.move_in_date ? new Date(a.move_in_date).toISOString().slice(0, 10) : '',
      contractEnd: a.contract_end ? new Date(a.contract_end).toISOString().slice(0, 10) : '',
      rentalStatus: a.rental_status,
      notes: a.notes || '',
      curfew: a.curfew || '',
      visitorPolicy: a.visitor_policy || '',
      description: a.description || '',
      lat: parseFloat(a.lat) || 0,
      lng: parseFloat(a.lng) || 0,
      amenities: [
        a.wifi && 'WiFi',
        a.house_aircon && 'Aircon',
        a.kitchen && 'Kitchen',
        a.laundry && 'Laundry',
        a.parking && 'Parking',
        a.pet_friendly && 'Pet friendly',
      ].filter(Boolean),
      owner: a.owner_name || '',
      ownerPhone: a.owner_phone || '',
      nextPayment: upcoming
        ? {
            month: upcoming.month_key,
            label: upcoming.label,
            amount: upcoming.amount,
            dueDate: upcoming.due_date ? new Date(upcoming.due_date).toISOString().slice(0, 10) : '',
            status: upcoming.status,
          }
        : null,
    })
  } catch (err) {
    console.error('Get accommodation error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   BOARDER — MY PAYMENTS (view-only)
   ================================================================ */
app.get('/api/boarder/payments', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(`
      SELECT p.id, p.month_key, p.label, p.amount, p.due_date, p.paid_date, p.status, p.method, p.reference
      FROM payments p
      JOIN boarder_rentals br ON br.id = p.rental_id
      WHERE br.boarder_id = ?
      ORDER BY p.due_date DESC
    `, [userId])
    res.json(rows.map(r => ({
      id: String(r.id),
      month: r.month_key,
      label: r.label,
      amount: r.amount,
      dueDate: r.due_date ? new Date(r.due_date).toISOString().slice(0, 10) : '',
      paidDate: r.paid_date ? new Date(r.paid_date).toISOString().slice(0, 10) : null,
      status: r.status,
      method: r.method,
      reference: r.reference,
    })))
  } catch (err) {
    console.error('Get boarder payments error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   BOARDER — MY REVIEWS
   ================================================================ */
function mapReviewRow(r) {
  return {
    id: String(r.id),
    houseId: String(r.house_id),
    houseName: r.house_name || '',
    houseImage: r.house_image || '',
    author: r.author_name || 'You',
    avatarColor: r.avatar_color || '#1E73E8',
    avatarUrl: r.avatar_url || '',
    rating: parseFloat(r.rating) || 0,
    categories: {
      cleanliness: r.cleanliness || 5,
      safety: r.safety || 5,
      comfort: r.comfort || 5,
      internet: r.internet || 5,
      owner: r.owner_rating || 5,
      location: r.location || 5,
      value: r.value_rating || 5,
    },
    comment: r.comment || '',
    date: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
    reply: r.reply || null,
  }
}

app.get('/api/boarder/reviews', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(`
      SELECT rv.*, u.name AS author_name, u.avatar_color, u.avatar_url, bh.name AS house_name,
        (SELECT hi.image_url FROM house_images hi WHERE hi.house_id = bh.id ORDER BY hi.sort_order LIMIT 1) AS house_image
      FROM reviews rv
      JOIN users u ON u.id = rv.boarder_id
      JOIN boarding_houses bh ON bh.id = rv.house_id
      WHERE rv.boarder_id = ?
      ORDER BY rv.created_at DESC
    `, [userId])
    res.json(rows.map(mapReviewRow))
  } catch (err) {
    console.error('Get boarder reviews error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/boarder/reviews', async (req, res) => {
  try {
    const { userId, houseId, rating, comment, categories } = req.body
    if (!userId || !houseId) return res.status(400).json({ error: 'userId and houseId are required' })
    const score = Number(rating)
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    const c = categories || {}
    const vals = [
      score, comment || null,
      Number(c.cleanliness) || Math.round(score),
      Number(c.safety) || Math.round(score),
      Number(c.comfort) || Math.round(score),
      Number(c.internet) || Math.round(score),
      Number(c.owner) || Math.round(score),
      Number(c.location) || Math.round(score),
      Number(c.value) || Math.round(score),
    ]
    const [existing] = await pool.query('SELECT id FROM reviews WHERE boarder_id = ? AND house_id = ?', [userId, houseId])
    if (existing.length > 0) {
      // Boarders may edit their OWN review only.
      await pool.query(
        'UPDATE reviews SET rating=?, comment=?, cleanliness=?, safety=?, comfort=?, internet=?, owner_rating=?, location=?, value_rating=? WHERE id = ?',
        [...vals, existing[0].id]
      )
    } else {
      await pool.query(
        'INSERT INTO reviews (house_id, boarder_id, rating, comment, cleanliness, safety, comfort, internet, owner_rating, location, value_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [houseId, userId, ...vals]
      )
    }
    // Recompute the public rating for that house.
    const [agg] = await pool.query('SELECT AVG(rating) AS avg_rating, COUNT(*) AS cnt FROM reviews WHERE house_id = ?', [houseId])
    await pool.query('UPDATE boarding_houses SET rating = ?, reviews_count = ? WHERE id = ?', [
      Number(agg[0].avg_rating || 0).toFixed(1),
      agg[0].cnt,
      houseId,
    ])
    const [house] = await pool.query('SELECT name, landlord_id FROM boarding_houses WHERE id = ?', [houseId])
    if (house.length > 0) {
      const [owner] = await pool.query('SELECT user_id FROM landlords WHERE id = ?', [house[0].landlord_id])
      if (owner.length > 0) {
        await insertNotification(owner[0].user_id, 'review', 'New review received', `A boarder left a ${score}-star review for ${house[0].name}.`, '/dashboard/reviews')
      }
    }
    res.json({ ok: true, updated: existing.length > 0 })
  } catch (err) {
    console.error('Save review error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   FAVORITES
   ================================================================ */
app.get('/api/favorites', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(`
      SELECT bh.*, l.business_name AS owner_name, l.user_id AS owner_user_id, u.avatar_url AS owner_avatar_url, f.created_at AS favorited_at,
        (SELECT COALESCE(SUM(r.capacity), 0) FROM rooms r WHERE r.house_id = bh.id) AS total_rooms_calc,
        (SELECT COALESCE(SUM(r.occupied), 0) FROM rooms r WHERE r.house_id = bh.id) AS occupied_rooms_calc
      FROM favorites f
      JOIN boarding_houses bh ON bh.id = f.house_id
      LEFT JOIN landlords l ON l.id = bh.landlord_id
      LEFT JOIN users u ON u.id = l.user_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [userId])
    const out = []
    for (const row of rows) out.push({ favoriteAt: row.favorited_at, house: await houseCardFromRow(row) })
    res.json(out)
  } catch (err) {
    console.error('Get favorites error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/favorites', async (req, res) => {
  try {
    const { userId, houseId } = req.body
    if (!userId || !houseId) return res.status(400).json({ error: 'userId and houseId are required' })
    await pool.query('INSERT IGNORE INTO favorites (user_id, house_id) VALUES (?, ?)', [userId, houseId])
    res.json({ ok: true, favorited: true })
  } catch (err) {
    console.error('Add favorite error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/favorites/:houseId', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    await pool.query('DELETE FROM favorites WHERE user_id = ? AND house_id = ?', [userId, req.params.houseId])
    res.json({ ok: true, favorited: false })
  } catch (err) {
    console.error('Remove favorite error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* How many favorites were added after the boarder last opened the Favorites
   page — powers the "Favorites [n]" sidebar badge. Only reads data; marking
   viewed never touches the favorites themselves. */
app.get('/api/favorites/unviewed-count', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n
         FROM favorites f
         LEFT JOIN favorite_views v ON v.user_id = f.user_id
        WHERE f.user_id = ?
          AND f.created_at > COALESCE(v.last_viewed_at, '1970-01-01')`,
      [userId]
    )
    res.json({ count: Number(rows[0]?.n || 0) })
  } catch (err) {
    console.error('Favorites unviewed count error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* Stamp "the boarder just opened their Favorites" — clears the badge without
   removing any favorite. Upsert keeps a single row per user. */
app.post('/api/favorites/mark-viewed', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    await pool.query(
      `INSERT INTO favorite_views (user_id, last_viewed_at) VALUES (?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE last_viewed_at = CURRENT_TIMESTAMP`,
      [userId]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Mark favorites viewed error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   RESERVATIONS  (request -> owner approve / decline)
   ================================================================ */
function mapReservation(r) {
  return {
    id: String(r.id),
    houseId: String(r.house_id),
    houseName: r.house_name || '',
    houseImage: r.house_image || '',
    municipality: r.municipality || '',
    barangay: r.barangay || '',
    roomId: r.room_id ? String(r.room_id) : null,
    roomNo: r.room_no || null,
    roomType: r.room_type || null,
    monthlyRent: r.monthly_rent || 0,
    moveInDate: r.move_in_date ? new Date(r.move_in_date).toISOString().slice(0, 10) : '',
    durationMonths: r.duration_months || null,
    message: r.message || null,
    status: r.status,
    ownerResponse: r.owner_response || null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
    decidedAt: r.decided_at ? new Date(r.decided_at).toISOString() : null,
    boarderName: r.boarder_name || '',
    boarderPhone: r.boarder_phone || '',
  }
}

const RESERVATION_SELECT = `
  SELECT rs.*, bh.name AS house_name, bh.municipality, bh.barangay,
    (SELECT hi.image_url FROM house_images hi WHERE hi.house_id = bh.id ORDER BY hi.sort_order LIMIT 1) AS house_image,
    r.room_no, r.type AS room_type, u.name AS boarder_name, u.phone AS boarder_phone
  FROM reservations rs
  JOIN boarding_houses bh ON bh.id = rs.house_id
  LEFT JOIN rooms r ON r.id = rs.room_id
  JOIN users u ON u.id = rs.boarder_id
`

app.get('/api/reservations', async (req, res) => {
  try {
    const { userId, ownerId } = req.query
    if (ownerId) {
      const [rows] = await pool.query(
        `${RESERVATION_SELECT} JOIN landlords l ON l.id = bh.landlord_id WHERE l.user_id = ? ORDER BY rs.created_at DESC`,
        [ownerId]
      )
      return res.json(rows.map(mapReservation))
    }
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(`${RESERVATION_SELECT} WHERE rs.boarder_id = ? ORDER BY rs.created_at DESC`, [userId])
    res.json(rows.map(mapReservation))
  } catch (err) {
    console.error('Get reservations error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/reservations', async (req, res) => {
  try {
    const { userId, houseId, roomId, moveInDate, durationMonths, message } = req.body
    if (!userId || !houseId || !moveInDate) {
      return res.status(400).json({ error: 'userId, houseId and moveInDate are required' })
    }
    const [house] = await pool.query('SELECT name, landlord_id FROM boarding_houses WHERE id = ?', [houseId])
    if (house.length === 0) return res.status(404).json({ error: 'Boarding house not found' })

    // Prevent duplicate open requests for the same house.
    const [open] = await pool.query(
      "SELECT id FROM reservations WHERE boarder_id = ? AND house_id = ? AND status = 'pending'",
      [userId, houseId]
    )
    if (open.length > 0) {
      return res.status(409).json({ error: 'You already have a pending reservation request for this boarding house.' })
    }

    let rent = null
    if (roomId) {
      const [room] = await pool.query('SELECT monthly_rent, capacity, occupied FROM rooms WHERE id = ? AND house_id = ?', [roomId, houseId])
      if (room.length === 0) return res.status(400).json({ error: 'Selected room is not available' })
      if (room[0].occupied >= room[0].capacity) return res.status(400).json({ error: 'That room is already fully occupied' })
      rent = room[0].monthly_rent
    }

    const [result] = await pool.query(
      'INSERT INTO reservations (boarder_id, house_id, room_id, move_in_date, duration_months, message, status) VALUES (?, ?, ?, ?, ?, ?, "pending")',
      [userId, houseId, roomId || null, moveInDate, durationMonths || null, message || null]
    )

    const [owner] = await pool.query('SELECT user_id FROM landlords WHERE id = ?', [house[0].landlord_id])
    if (owner.length > 0) {
      await insertNotification(
        owner[0].user_id,
        'reservation',
        'New reservation request',
        `A boarder requested a room at ${house[0].name}.` + (rent ? ` Rate: ₱${Number(rent).toLocaleString('en-PH')}/month.` : ''),
        '/dashboard/reservations'
      )
    }

    const [rows] = await pool.query(`${RESERVATION_SELECT} WHERE rs.id = ?`, [result.insertId])
    res.json(mapReservation(rows[0]))
  } catch (err) {
    console.error('Create reservation error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ? AND boarder_id = ?', [req.params.id, userId])
    if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found' })
    if (rows[0].status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be cancelled' })
    await pool.query('UPDATE reservations SET status = "cancelled", decided_at = NOW() WHERE id = ?', [req.params.id])
    const [updated] = await pool.query(`${RESERVATION_SELECT} WHERE rs.id = ?`, [req.params.id])
    res.json(mapReservation(updated[0]))
  } catch (err) {
    console.error('Cancel reservation error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/reservations/:id', async (req, res) => {
  try {
    const { ownerId, status, response } = req.body
    if (!ownerId) return res.status(400).json({ error: 'ownerId is required' })
    if (!['approved', 'declined'].includes(status)) return res.status(400).json({ error: 'status must be approved or declined' })

    const [rows] = await pool.query(
      `${RESERVATION_SELECT} JOIN landlords l ON l.id = bh.landlord_id WHERE rs.id = ? AND l.user_id = ?`,
      [req.params.id, ownerId]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found' })
    const rs = rows[0]
    if (rs.status !== 'pending') return res.status(400).json({ error: 'This request has already been decided' })

    await pool.query(
      'UPDATE reservations SET status = ?, owner_response = ?, decided_at = NOW() WHERE id = ?',
      [status, response || null, req.params.id]
    )

    let attached = false
    if (status === 'approved') {
      attached = await attachApprovedAccommodation(rs)
    }

    await insertNotification(
      rs.boarder_id,
      'reservation',
      status === 'approved' ? 'Reservation Approved' : 'Reservation Declined',
      status === 'approved'
        ? `Your reservation request at ${rs.house_name} has been approved.${attached ? ' It now appears on My Home.' : ''}`
        : `Your reservation request at ${rs.house_name} was declined.` + (response ? ` Owner note: ${response}` : ''),
      '/boarder/reservations'
    )

    const [updated] = await pool.query(`${RESERVATION_SELECT} WHERE rs.id = ?`, [req.params.id])
    res.json({ ...mapReservation(updated[0]), accommodationAttached: attached })
  } catch (err) {
    console.error('Respond to reservation error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   CONVERSATIONS / MESSAGES  (boarder <-> owner)
   ================================================================ */
function mapConversation(c, viewerId) {
  const viewerIsBoarder = String(c.boarder_id) === String(viewerId)
  return {
    id: String(c.id),
    houseId: String(c.house_id),
    houseName: c.house_name || '',
    houseImage: c.house_image || '',
    boarderId: String(c.boarder_id),
    ownerUserId: c.owner_user_id ? String(c.owner_user_id) : '',
    boarderName: c.boarder_name || '',
    ownerName: c.owner_name || '',
    // The viewer always sees the OTHER party as the conversation title.
    title: viewerIsBoarder ? c.owner_name || 'Owner' : c.boarder_name || 'Boarder',
    viewerIsBoarder,
    lastMessage: c.last_message || '',
    lastMessageAt: c.last_message_at ? new Date(c.last_message_at).toISOString() : null,
    unreadCount: Number(c.unread) || 0,
  }
}

const CONVERSATION_SELECT = `
  SELECT c.*, bh.name AS house_name,
    (SELECT hi.image_url FROM house_images hi WHERE hi.house_id = bh.id ORDER BY hi.sort_order LIMIT 1) AS house_image,
    bu.name AS boarder_name, lu.name AS owner_name, l.user_id AS owner_user_id
  FROM conversations c
  JOIN boarding_houses bh ON bh.id = c.house_id
  JOIN landlords l ON l.id = c.landlord_id
  JOIN users lu ON lu.id = l.user_id
  JOIN users bu ON bu.id = c.boarder_id
`

async function assertConversationAccess(id, userId) {
  const [rows] = await pool.query(`${CONVERSATION_SELECT} WHERE c.id = ?`, [id])
  if (rows.length === 0) return null
  const c = rows[0]
  const allowed = String(c.boarder_id) === String(userId) || String(c.owner_user_id) === String(userId)
  return allowed ? c : null
}

app.get('/api/conversations', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(
      `${CONVERSATION_SELECT}
       WHERE c.boarder_id = ? OR l.user_id = ?
       ORDER BY c.last_message_at DESC`,
      [userId, userId]
    )
    const out = []
    for (const c of rows) {
      const [unread] = await pool.query(
        'SELECT COUNT(*) AS cnt FROM messages WHERE conversation_id = ? AND is_read = FALSE AND sender_id != ?',
        [c.id, userId]
      )
      out.push(mapConversation({ ...c, unread: unread[0].cnt }, userId))
    }
    res.json(out)
  } catch (err) {
    console.error('Get conversations error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/conversations', async (req, res) => {
  try {
    const { userId, houseId, body } = req.body
    if (!userId || !houseId) return res.status(400).json({ error: 'userId and houseId are required' })
    const [house] = await pool.query('SELECT name, landlord_id FROM boarding_houses WHERE id = ?', [houseId])
    if (house.length === 0) return res.status(404).json({ error: 'Boarding house not found' })
    const landlordId = house[0].landlord_id

    let conversationId
    const [existing] = await pool.query('SELECT id FROM conversations WHERE boarder_id = ? AND house_id = ?', [userId, houseId])
    if (existing.length > 0) {
      conversationId = existing[0].id
    } else {
      const [created] = await pool.query(
        'INSERT INTO conversations (boarder_id, landlord_id, house_id) VALUES (?, ?, ?)',
        [userId, landlordId, houseId]
      )
      conversationId = created.insertId
    }

    if (body && String(body).trim()) {
      await pool.query('INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)', [conversationId, userId, String(body).trim()])
      await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [conversationId])
      const [owner] = await pool.query('SELECT user_id FROM landlords WHERE id = ?', [landlordId])
      if (owner.length > 0) {
        const [sender] = await pool.query('SELECT name FROM users WHERE id = ?', [userId])
        await insertNotification(
          owner[0].user_id,
          'message',
          'New Message',
          `You received a new message from ${sender[0]?.name || 'a boarder'} about ${house[0].name}.`,
          '/dashboard/messages'
        )
      }
    }

    const [rows] = await pool.query(`${CONVERSATION_SELECT} WHERE c.id = ?`, [conversationId])
    const [unread] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM messages WHERE conversation_id = ? AND is_read = FALSE AND sender_id != ?',
      [conversationId, userId]
    )
    res.json(mapConversation({ ...rows[0], unread: unread[0].cnt }, userId))
  } catch (err) {
    console.error('Start conversation error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const c = await assertConversationAccess(req.params.id, userId)
    if (!c) return res.status(404).json({ error: 'Conversation not found' })

    // Opening a conversation marks the other party's messages as read.
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ?',
      [c.id, userId]
    )

    const [msgs] = await pool.query(
      'SELECT id, sender_id, body, is_read, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC',
      [c.id]
    )
    res.json({
      conversation: mapConversation({ ...c, unread: 0 }, userId),
      messages: msgs.map(m => ({
        id: String(m.id),
        conversationId: String(c.id),
        senderId: String(m.sender_id),
        mine: String(m.sender_id) === String(userId),
        body: m.body,
        isRead: !!m.is_read,
        createdAt: m.created_at ? new Date(m.created_at).toISOString() : '',
      })),
    })
  } catch (err) {
    console.error('Get messages error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { userId, body } = req.body
    if (!userId || !body || !String(body).trim()) return res.status(400).json({ error: 'userId and body are required' })
    const c = await assertConversationAccess(req.params.id, userId)
    if (!c) return res.status(404).json({ error: 'Conversation not found' })

    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
      [c.id, userId, String(body).trim()]
    )
    await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [c.id])

    const viewerIsBoarder = String(c.boarder_id) === String(userId)
    const recipientId = viewerIsBoarder ? c.owner_user_id : c.boarder_id
    const [sender] = await pool.query('SELECT name FROM users WHERE id = ?', [userId])
    await insertNotification(
      recipientId,
      'message',
      'New Message',
      `You received a new message from ${sender[0]?.name || 'a user'} about ${c.house_name}.`,
      viewerIsBoarder ? '/dashboard/messages' : '/boarder/messages'
    )

    res.json({
      id: String(result.insertId),
      conversationId: String(c.id),
      senderId: String(userId),
      mine: true,
      body: String(body).trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Send message error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/conversations/:id/read', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const c = await assertConversationAccess(req.params.id, userId)
    if (!c) return res.status(404).json({ error: 'Conversation not found' })
    await pool.query('UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ?', [c.id, userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('Mark conversation read error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   NOTIFICATIONS — per-user read state
   ================================================================ */
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('Mark notification read error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   BOARDER PROFILE / ACCOUNT SETTINGS
   ================================================================ */
app.get('/api/boarder/profile', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar_color, u.avatar_url, u.role, u.created_at,
        bp.age, bp.gender, bp.school, bp.course, bp.guardian_name, bp.guardian_phone, bp.address
      FROM users u
      LEFT JOIN boarder_profiles bp ON bp.user_id = u.id
      WHERE u.id = ?
    `, [userId])
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })
    const u = rows[0]
    res.json({
      id: String(u.id),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      avatarColor: u.avatar_color || '#1E73E8',
      avatarUrl: u.avatar_url || '',
      role: u.role,
      memberSince: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
      age: u.age || null,
      gender: u.gender || '',
      school: u.school || '',
      course: u.course || '',
      guardianName: u.guardian_name || '',
      guardianPhone: u.guardian_phone || '',
      address: u.address || '',
    })
  } catch (err) {
    console.error('Get boarder profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/boarder/profile', async (req, res) => {
  try {
    const { userId, name, phone, age, gender, school, course, guardianName, guardianPhone, address, avatarUrl } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [urows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId])
    if (urows.length === 0) return res.status(404).json({ error: 'User not found' })
    // Landlords edit their name/phone/photo here too, so this endpoint is
    // shared: boarders additionally get the boarder_profiles upsert below.
    if (!['boarder', 'landlord', 'admin'].includes(urows[0].role)) {
      return res.status(403).json({ error: 'Not a boarder account' })
    }
    const isBoarder = urows[0].role === 'boarder'

    if (name !== undefined) await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, userId])
    if (phone !== undefined) await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId])

    // Landlords only: "Property / boarding house name" — stored on the
    // landlord profile as the business name, which is what Explore shows.
    const { property } = req.body
    if (property !== undefined && urows[0].role === 'landlord') {
      await pool.query('UPDATE landlords SET business_name = ? WHERE user_id = ?', [String(property).trim().slice(0, 255), userId])
    }

    // Profile photo: either an uploaded image (data URL) or an external image
    // URL. Size is capped so a single photo can never bloat the users table.
    if (avatarUrl !== undefined) {
      const value = String(avatarUrl || '')
      const looksLikeImage = /^(data:image\/(png|jpe?g|webp|gif);base64,|https?:\/\/)/i.test(value)
      if (value && !looksLikeImage) {
        return res.status(400).json({ error: 'Profile photo must be an image file or an image link.' })
      }
      if (value.length > 1800000) {
        return res.status(413).json({ error: 'That profile photo is too large. Please choose a smaller image.' })
      }
      await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [value || null, userId])
    }

    if (isBoarder) {
      await pool.query(
        `INSERT INTO boarder_profiles (user_id, age, gender, school, course, guardian_name, guardian_phone, address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE age = VALUES(age), gender = VALUES(gender), school = VALUES(school),
           course = VALUES(course), guardian_name = VALUES(guardian_name), guardian_phone = VALUES(guardian_phone), address = VALUES(address)`,
        [userId, age || null, gender || null, school || null, course || null, guardianName || null, guardianPhone || null, address || null]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Update boarder profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   STARTUP — guarded schema guarantees
   ================================================================ */

/**
 * Make sure `users.avatar_url` exists. database/boarder_avatar.sql does the
 * same thing, but running it by hand is easy to forget — and a missing column
 * would break login, because the auth queries select it. Safe on every boot:
 * it only ALTERs when the column is actually absent.
 */
async function ensureSchema() {
  try {
    const [cols] = await pool.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'`
    )
    if (!Number(cols[0]?.n)) {
      await pool.query('ALTER TABLE users ADD COLUMN avatar_url MEDIUMTEXT DEFAULT NULL AFTER avatar_color')
      console.log('✅ Added users.avatar_url — profile photos enabled')
    }
  } catch (err) {
    console.warn('Schema check skipped:', err.message)
  }

  try {
    /* Boarder "Favorites [n]" badge: remembers when each boarder last opened
       the Favorites page so only genuinely new favorites count as unviewed. */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorite_views (
        user_id int(11) NOT NULL PRIMARY KEY,
        last_viewed_at timestamp NOT NULL DEFAULT current_timestamp()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  } catch (err) {
    console.warn('favorite_views schema check skipped:', err.message)
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS landlord_documents (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        landlord_id int(11) NOT NULL,
        doc_type enum('valid_id','business_permit','sec_registration','other','legal_documents') NOT NULL,
        doc_name varchar(255) NOT NULL,
        doc_url MEDIUMTEXT NOT NULL,
        status enum('pending','approved','rejected') DEFAULT 'pending',
        notes text DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    await pool.query(`
      ALTER TABLE landlord_documents
        MODIFY doc_type enum('valid_id','business_permit','sec_registration','other','legal_documents') NOT NULL,
        MODIFY doc_url MEDIUMTEXT NOT NULL
    `)
  } catch (err) {
    console.warn('landlord_documents schema check skipped:', err.message)
  }

  try {
    /* Landlord sign-up saves the owner's chosen map location onto the
       `landlords` row, so these three columns have to exist. The CREATE TABLE in
       database/boardease.sql includes them for a fresh install, but the
       multi-statement ALTER (which is what adds them to an existing database)
       aborts on the first duplicate column — easy to end up without them. */
    const [locCols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'landlords'
          AND COLUMN_NAME IN ('location_pref', 'location_lat', 'location_lng')`
    )
    const haveLoc = new Set(locCols.map((c) => c.COLUMN_NAME))
    if (!haveLoc.has('location_pref')) {
      await pool.query('ALTER TABLE landlords ADD COLUMN location_pref varchar(255) DEFAULT NULL')
      console.log('✅ Added landlords.location_pref — landlord sign-up can save a location')
    }
    if (!haveLoc.has('location_lat')) {
      await pool.query('ALTER TABLE landlords ADD COLUMN location_lat decimal(10,7) DEFAULT NULL')
      console.log('✅ Added landlords.location_lat')
    }
    if (!haveLoc.has('location_lng')) {
      await pool.query('ALTER TABLE landlords ADD COLUMN location_lng decimal(10,7) DEFAULT NULL')
      console.log('✅ Added landlords.location_lng')
    }
  } catch (err) {
    console.warn('landlords location schema check skipped:', err.message)
  }

  try {
    /* Room photo + needs: the Edit Room modal stores a picture of the actual
       room and the per-room amenities boarders ask about. Created on boot so
       the modal works on databases created from older dumps. */
    await pool.query(`
      ALTER TABLE rooms
        ADD COLUMN photo MEDIUMTEXT DEFAULT NULL,
        ADD COLUMN needs TEXT DEFAULT NULL
    `)
    console.log('✅ Added rooms.photo and rooms.needs — room editing enabled')
  } catch (err) {
    // 1060 = duplicate column — expected on every boot after the first.
    if (err.errno !== 1060 && err.code !== 'ER_DUP_FIELDNAME') {
      console.warn('rooms photo/needs schema check skipped:', err.message)
    }
  }

  try {
    /* Landlord house photos live in `house_images` as data URLs. The CREATE
       TABLE in database/boardease.sql has this table, but a database created
       from an older dump may not — create it on boot so photo uploads never
       hit a missing-table error. */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS house_images (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        house_id int(11) NOT NULL,
        image_url MEDIUMTEXT NOT NULL,
        sort_order int(11) DEFAULT 0,
        KEY house_id (house_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    const [imgCol] = await pool.query(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'house_images' AND COLUMN_NAME = 'image_url'`
    )
    if (imgCol.length > 0 && String(imgCol[0].DATA_TYPE).toLowerCase() !== 'mediumtext') {
      await pool.query('ALTER TABLE house_images MODIFY image_url MEDIUMTEXT NOT NULL')
      console.log('✅ Widened house_images.image_url — house photo uploads enabled')
    }
  } catch (err) {
    console.warn('house_images schema check skipped:', err.message)
  }

  try {
    /* Landlord walkthrough videos live in their own table so a big clip never
       bloats the photo gallery queries. Created on boot, same as house_images. */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS house_videos (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        house_id int(11) NOT NULL,
        video_url MEDIUMTEXT NOT NULL,
        title varchar(120) DEFAULT NULL,
        sort_order int(11) DEFAULT 0,
        KEY house_id (house_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  } catch (err) {
    console.warn('house_videos schema check skipped:', err.message)
  }

  try {
    /* Account-deletion receipts: when a boarder deletes their account, a
       receipt of what was removed is archived here for record-keeping — the
       user row itself is gone, so this is the only trace left. */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_deletion_receipts (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id int(11) NOT NULL,
        name varchar(255) DEFAULT NULL,
        email varchar(255) NOT NULL,
        role varchar(20) NOT NULL DEFAULT 'boarder',
        reservations_count int(11) NOT NULL DEFAULT 0,
        rentals_count int(11) NOT NULL DEFAULT 0,
        reviews_count int(11) NOT NULL DEFAULT 0,
        favorites_count int(11) NOT NULL DEFAULT 0,
        messages_count int(11) NOT NULL DEFAULT 0,
        requested_at timestamp NOT NULL DEFAULT current_timestamp(),
        KEY user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  } catch (err) {
    console.warn('account_deletion_receipts schema check skipped:', err.message)
  }

  try {
    /* `landlords.subscription` shipped as enum('none','starter',...) in an older
       dump, while every part of the app writes 'basic' — so choosing the Basic
       plan either errored or stored an invalid value. Widen it to the set the
       code actually uses, but only when it needs widening. */
    const [subCol] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'landlords' AND COLUMN_NAME = 'subscription'`
    )
    if (subCol.length > 0 && !String(subCol[0].COLUMN_TYPE).includes("'basic'")) {
      await pool.query(
        "ALTER TABLE landlords MODIFY subscription enum('none','basic','standard','premium') NULL DEFAULT 'none'"
      )
      console.log('✅ Fixed landlords.subscription enum — the Basic plan can now be saved')
    }
  } catch (err) {
    console.warn('subscription enum check skipped:', err.message)
  }

  try {
    /* Subscription receipts used to live in an in-memory array, so a
       `node --watch` restart threw away every receipt a landlord had submitted
       before the admin ever saw it. They belong in the database. */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_receipts (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        landlord_id int(11) NOT NULL,
        requested_plan varchar(20) NOT NULL,
        plan_price int(11) NOT NULL DEFAULT 0,
        receipt_url MEDIUMTEXT NOT NULL,
        status enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        notes text DEFAULT NULL,
        submitted_at timestamp NOT NULL DEFAULT current_timestamp(),
        reviewed_at timestamp NULL DEFAULT NULL,
        KEY landlord_id (landlord_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  } catch (err) {
    console.warn('subscription_receipts schema check skipped:', err.message)
  }

  try {
    /* Landlord ↔ admin messages about a plan ("contact admin"). */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_messages (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id int(11) NOT NULL,
        landlord_id int(11) DEFAULT NULL,
        plan varchar(20) DEFAULT NULL,
        body text NOT NULL,
        reply text DEFAULT NULL,
        replied_at timestamp NULL DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        KEY user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  } catch (err) {
    console.warn('admin_messages schema check skipped:', err.message)
  }
}

/* ================================================================
   ADMIN ENDPOINTS
   ================================================================ */

/* Monthly prices, keyed by the plan name the UI sends. The key doubles as the
   `landlords.subscription` enum value, so it is the single source of truth for
   which plans are valid. */
const PLAN_PRICES = { basic: 199, standard: 499, premium: 899 }

/** Shape a `subscription_receipts` row for the admin console and the
 *  landlord's own history page. */
function receiptRow(r) {
  return {
    id: String(r.id),
    landlordId: String(r.landlord_id),
    landlordName: r.landlord_name || 'Unknown Landlord',
    landlordEmail: r.landlord_email || '',
    requestedPlan: r.requested_plan,
    planPrice: Number(r.plan_price) || 0,
    receiptUrl: r.receipt_url,
    status: r.status,
    notes: r.notes || null,
    submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
  }
}

/** Receipt queries join the landlord and user so both consoles can show a name. */
const RECEIPT_SELECT = `
  SELECT r.*, u.name AS landlord_name, u.email AS landlord_email
  FROM subscription_receipts r
  LEFT JOIN landlords l ON l.id = r.landlord_id
  LEFT JOIN users u ON u.id = l.user_id
`

// Recent account-deletion receipts (admin record-keeping).
app.get('/api/admin/deletion-receipts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM account_deletion_receipts ORDER BY requested_at DESC LIMIT 50'
    )
    res.json(
      rows.map((r) => ({
        id: String(r.id),
        userId: String(r.user_id),
        name: r.name || '',
        email: r.email,
        role: r.role,
        reservations: r.reservations_count,
        rentals: r.rentals_count,
        reviews: r.reviews_count,
        favorites: r.favorites_count,
        messages: r.messages_count,
        requestedAt: r.requested_at ? new Date(r.requested_at).toISOString() : '',
      }))
    )
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json([])
    console.error('Deletion receipts error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [landlords] = await pool.query('SELECT COUNT(*) AS cnt FROM landlords')
    const [planCounts] = await pool.query(
      `SELECT subscription, COUNT(*) AS cnt FROM landlords GROUP BY subscription`
    )
    const planBreakdown = { basic: 0, standard: 0, premium: 0, none: 0 }
    for (const row of planCounts) {
      const key = row.subscription || 'none'
      if (key in planBreakdown) planBreakdown[key] = Number(row.cnt)
    }

    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [pendingRows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM subscription_receipts WHERE status = 'pending'"
    )
    const [approvedRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM subscription_receipts
        WHERE status = 'approved' AND reviewed_at IS NOT NULL
          AND DATE_FORMAT(reviewed_at, '%Y-%m') = ?`,
      [thisMonth]
    )
    const [openMessages] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM admin_messages WHERE reply IS NULL'
    )
    const pending = Number(pendingRows[0]?.cnt || 0)
    const approvedThisMonth = Number(approvedRows[0]?.cnt || 0)
    // Revenue: sum of active plan prices
    const totalRevenue = Object.entries(planBreakdown).reduce((sum, [plan, count]) => {
      return sum + (PLAN_PRICES[plan] || 0) * count
    }, 0)
    res.json({
      totalLandlords: Number(landlords[0]?.cnt || 0),
      pendingReceipts: pending,
      approvedThisMonth,
      pendingMessages: Number(openMessages[0]?.cnt || 0),
      totalRevenue,
      planBreakdown,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// List all landlords
app.get('/api/admin/landlords', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar_color, u.avatar_url, u.created_at,
        l.id AS landlord_id, l.business_name, l.verified, l.subscription,
        l.location_pref
      FROM users u
      JOIN landlords l ON l.user_id = u.id
      WHERE u.role = 'landlord'
      ORDER BY u.created_at DESC
    `)
    res.json(rows.map(r => ({
      id: String(r.id),
      name: r.name,
      email: r.email,
      phone: r.phone || '',
      avatarColor: r.avatar_color || '#1E73E8',
      landlordId: r.landlord_id ? String(r.landlord_id) : '',
      businessName: r.business_name || '',
      verified: !!r.verified,
      subscription: r.subscription || 'none',
      locationPref: r.location_pref || '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
    })))
  } catch (err) {
    console.error('Admin list landlords error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// List subscription receipts (admin)
app.get('/api/admin/receipts', async (req, res) => {
  try {
    const { status } = req.query
    let sql = `${RECEIPT_SELECT} WHERE 1=1`
    const params = []
    if (status && status !== 'all') { sql += ' AND r.status = ?'; params.push(status) }
    sql += ' ORDER BY r.submitted_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(receiptRow))
  } catch (err) {
    console.error('Admin list receipts error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Landlord submits a payment receipt — this is what the admin actually reviews.
app.post('/api/subscription/receipts', async (req, res) => {
  try {
    const { userId, plan, receiptUrl } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    const landlord = await landlordForUser(userId)
    if (!landlord) {
      return res.status(404).json({ error: 'This account has no landlord profile. Complete landlord sign-up first.' })
    }

    // The plan key doubles as the enum value, so this also validates the name.
    const planKey = String(plan || '').toLowerCase()
    const price = PLAN_PRICES[planKey]
    if (!price) {
      return res.status(400).json({ error: 'Choose a valid plan: Basic, Standard, or Premium.' })
    }
    if (!isHouseImageDataUrl(receiptUrl)) {
      return res.status(400).json({ error: 'Upload a JPG, PNG, or WebP screenshot of your receipt.' })
    }
    if (String(receiptUrl).length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'That receipt image is too large. Please upload one under 4 MB.' })
    }

    const [result] = await pool.query(
      'INSERT INTO subscription_receipts (landlord_id, requested_plan, plan_price, receipt_url) VALUES (?, ?, ?, ?)',
      [landlord.id, planKey, price, String(receiptUrl).trim()]
    )

    const [rows] = await pool.query(`${RECEIPT_SELECT} WHERE r.id = ?`, [result.insertId])
    res.json({ receipt: receiptRow(rows[0]) })
  } catch (err) {
    console.error('Submit subscription receipt error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// The landlord's own receipt history.
app.get('/api/subscription/receipts', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const landlord = await landlordForUser(userId)
    if (!landlord) return res.json([])
    const [rows] = await pool.query(
      `${RECEIPT_SELECT} WHERE r.landlord_id = ? ORDER BY r.submitted_at DESC`,
      [landlord.id]
    )
    res.json(rows.map(receiptRow))
  } catch (err) {
    console.error('List own receipts error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   SUPPORT — landlord ↔ admin messages ("contact admin")
   ================================================================ */

function supportRow(m) {
  return {
    id: String(m.id),
    userId: String(m.user_id),
    landlordId: m.landlord_id ? String(m.landlord_id) : '',
    landlordName: m.landlord_name || '',
    landlordEmail: m.landlord_email || '',
    plan: m.plan || '',
    body: m.body,
    reply: m.reply || null,
    repliedAt: m.replied_at ? new Date(m.replied_at).toISOString() : null,
    createdAt: m.created_at ? new Date(m.created_at).toISOString() : null,
  }
}

const SUPPORT_SELECT = `
  SELECT m.*, u.name AS landlord_name, u.email AS landlord_email
  FROM admin_messages m
  LEFT JOIN users u ON u.id = m.user_id
`

// A landlord asks the admin about a plan.
app.post('/api/support/messages', async (req, res) => {
  try {
    const { userId, plan, body } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const message = trimStr(body, 2000)
    if (!message) return res.status(400).json({ error: 'Please write a message.' })

    const landlord = await landlordForUser(userId)
    const [result] = await pool.query(
      'INSERT INTO admin_messages (user_id, landlord_id, plan, body) VALUES (?, ?, ?, ?)',
      [userId, landlord ? landlord.id : null, trimStr(plan, 20) || null, message]
    )
    const [rows] = await pool.query(`${SUPPORT_SELECT} WHERE m.id = ?`, [result.insertId])
    res.json({ message: supportRow(rows[0]) })
  } catch (err) {
    console.error('Send support message error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// A landlord's own conversation with the admin.
app.get('/api/support/messages', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(
      `${SUPPORT_SELECT} WHERE m.user_id = ? ORDER BY m.created_at DESC`,
      [userId]
    )
    res.json(rows.map(supportRow))
  } catch (err) {
    console.error('List support messages error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin inbox — newest first, unreplied first.
app.get('/api/admin/messages', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${SUPPORT_SELECT} ORDER BY (m.reply IS NULL) DESC, m.created_at DESC`
    )
    res.json(rows.map(supportRow))
  } catch (err) {
    console.error('Admin list messages error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin replies, and the landlord gets a notification linking back to history.
app.put('/api/admin/messages/:id', async (req, res) => {
  try {
    const reply = trimStr(req.body.reply, 2000)
    if (!reply) return res.status(400).json({ error: 'Please write a reply.' })

    const [found] = await pool.query('SELECT * FROM admin_messages WHERE id = ?', [req.params.id])
    if (found.length === 0) return res.status(404).json({ error: 'Message not found' })

    await pool.query('UPDATE admin_messages SET reply = ?, replied_at = NOW() WHERE id = ?', [reply, found[0].id])

    await insertNotification(
      found[0].user_id,
      'subscription',
      'Admin replied to your message',
      reply.length > 120 ? `${reply.slice(0, 120)}…` : reply,
      '/dashboard/subscription/history'
    )

    const [rows] = await pool.query(`${SUPPORT_SELECT} WHERE m.id = ?`, [found[0].id])
    res.json({ message: supportRow(rows[0]) })
  } catch (err) {
    console.error('Admin reply message error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin approve/reject a receipt. Approving is what activates the plan.
app.put('/api/admin/receipts/:id', async (req, res) => {
  try {
    const { status, notes } = req.body
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' })
    }

    const [found] = await pool.query('SELECT * FROM subscription_receipts WHERE id = ?', [req.params.id])
    if (found.length === 0) return res.status(404).json({ error: 'Receipt not found' })
    const receipt = found[0]

    await pool.query(
      'UPDATE subscription_receipts SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?',
      [status, notes ? trimStr(notes, 500) : null, receipt.id]
    )

    const [landlordRows] = await pool.query('SELECT user_id FROM landlords WHERE id = ?', [receipt.landlord_id])
    const landlordUserId = landlordRows[0]?.user_id
    const planName = String(receipt.requested_plan)

    if (status === 'approved') {
      // The plan key is the enum value, so only accept plans we actually sell.
      if (PLAN_PRICES[planName.toLowerCase()]) {
        await pool.query('UPDATE landlords SET subscription = ? WHERE id = ?', [planName.toLowerCase(), receipt.landlord_id])
      }
      await insertNotification(
        landlordUserId,
        'subscription',
        'Plan Activated!',
        `Your ${planName} subscription has been activated. All features are now unlocked.`,
        '/dashboard/subscription'
      )
    } else {
      await insertNotification(
        landlordUserId,
        'subscription',
        'Receipt Rejected',
        `Your payment receipt for the ${planName} plan was rejected. ${notes ? 'Reason: ' + notes : 'Please try again.'}`,
        '/dashboard/subscription'
      )
    }

    const [rows] = await pool.query(`${RECEIPT_SELECT} WHERE r.id = ?`, [receipt.id])
    res.json(receiptRow(rows[0]))
  } catch (err) {
    console.error('Review receipt error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   ADMIN — Profile & Credentials
   ================================================================ */

// Get admin profile
app.get('/api/admin/profile', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, avatar_color, avatar_url, role FROM users WHERE id = ? AND role = ?',
      [userId, 'admin']
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Admin not found' })
    const u = rows[0]
    res.json({
      id: String(u.id),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      avatarColor: u.avatar_color || '#0B2D63',
      avatarUrl: u.avatar_url || '',
      role: u.role,
    })
  } catch (err) {
    console.error('Get admin profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update admin profile (name, phone)
app.put('/api/admin/profile', async (req, res) => {
  try {
    const { userId, name, phone, avatarUrl } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const [urows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId])
    if (urows.length === 0) return res.status(404).json({ error: 'User not found' })
    if (urows[0].role !== 'admin') return res.status(403).json({ error: 'Not an admin account' })
    if (name !== undefined) await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, userId])
    if (phone !== undefined) await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId])
    if (avatarUrl !== undefined) {
      const value = String(avatarUrl || '')
      await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [value || null, userId])
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Update admin profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Change admin email
app.put('/api/admin/email', async (req, res) => {
  try {
    const { userId, newEmail, currentPassword } = req.body
    if (!userId || !newEmail || !currentPassword) {
      return res.status(400).json({ error: 'userId, newEmail, and currentPassword are required' })
    }
    const cleanEmail = String(newEmail).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    // Verify current password
    const [urows] = await pool.query('SELECT id, role, password FROM users WHERE id = ?', [userId])
    if (urows.length === 0) return res.status(404).json({ error: 'User not found' })
    if (urows[0].role !== 'admin') return res.status(403).json({ error: 'Not an admin account' })
    if (urows[0].password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    // Check email is not taken
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, userId])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'That email is already in use by another account' })
    }
    await pool.query('UPDATE users SET email = ? WHERE id = ?', [cleanEmail, userId])
    res.json({ ok: true, email: cleanEmail })
  } catch (err) {
    console.error('Change admin email error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Change admin password
app.put('/api/admin/password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'userId, currentPassword, and newPassword are required' })
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    const [urows] = await pool.query('SELECT id, role, password FROM users WHERE id = ?', [userId])
    if (urows.length === 0) return res.status(404).json({ error: 'User not found' })
    if (urows[0].role !== 'admin') return res.status(403).json({ error: 'Not an admin account' })
    if (urows[0].password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId])
    res.json({ ok: true })
  } catch (err) {
    console.error('Change admin password error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   API 404 — always answer JSON (never Express' HTML error page)

   This MUST be registered after every route: Express matches middleware in
   order, so when it sat earlier in the file it swallowed every endpoint
   declared below it (the whole admin, subscription and support API).
   ================================================================ */
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `API endpoint ${req.method} ${req.originalUrl} is not available on the running server. If the server was just changed, restart it (npm run dev).`,
  })
})

/* ================================================================
   START
   ================================================================ */
app.listen(PORT, () => {
  console.log(`🚀 BoardEase API server running on http://localhost:${PORT}`)
  ensureSchema()
})
