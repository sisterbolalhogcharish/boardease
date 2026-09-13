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
    status: vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(totalRooms * 0.1)) ? 'almost-full' : 'available',
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const cleanEmail = String(email).trim().toLowerCase()
    const [rows] = await pool.query(
      'SELECT id, email, name, role, avatar_color, avatar_url, phone FROM users WHERE email = ? AND password = ?',
      [cleanEmail, password]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
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
    res.status(500).json({ error: 'Server error' })
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

    // --- Check for existing email ---
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })
    }

    // --- Create user ---
    const AVATAR_COLORS = ['#1E73E8', '#33C7A5', '#0B2D63', '#F59E0B', '#EF4444']
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    const [userResult] = await pool.query(
      'INSERT INTO users (email, password, role, name, phone, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanEmail, password, 'landlord', String(fullName).trim(), String(mobileNumber).trim(), avatarColor]
    )
    const userId = userResult.insertId

    // --- Create landlord profile with location preference ---
    const [landlordResult] = await pool.query(
      'INSERT INTO landlords (user_id, location_pref, location_lat, location_lng) VALUES (?, ?, ?, ?)',
      [userId, String(locationPref).trim(),
       locationLat ? parseFloat(locationLat) : null,
       locationLng ? parseFloat(locationLng) : null]
    )
    const landlordId = landlordResult.insertId

    // --- Store submitted documents (always includes required Valid ID + Documents) ---
    for (const doc of preparedDocs) {
      await pool.query(
        'INSERT INTO landlord_documents (landlord_id, doc_type, doc_name, doc_url) VALUES (?, ?, ?, ?)',
        [landlordId, doc.docType, String(doc.docName).trim(), String(doc.docUrl).trim()]
      )
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
      locationPref: String(locationPref).trim(),
      locationLat: locationLat ? parseFloat(locationLat) : null,
      locationLng: locationLng ? parseFloat(locationLng) : null,
    })
  } catch (err) {
    console.error('Landlord register error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   HOUSES (Boarding Houses)
   ================================================================ */
app.get('/api/houses', async (req, res) => {
  try {
    const {
      q, municipality, barangay, school, maxRent, gender,
      onlyAvailable, minRating, wifi, aircon, kitchen,
      laundry, parking, petFriendly, curfew, sort
    } = req.query

    let sql = `
      SELECT bh.*, l.business_name AS owner_name, l.verified AS owner_verified,
        (SELECT COUNT(*) FROM rooms r WHERE r.house_id = bh.id) AS total_rooms_calc,
        (SELECT COALESCE(SUM(r.occupied), 0) FROM rooms r WHERE r.house_id = bh.id) AS occupied_rooms_calc
      FROM boarding_houses bh
      LEFT JOIN landlords l ON l.id = bh.landlord_id
      WHERE 1=1
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
        status: vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms_calc * 0.1)) ? 'almost-full' : 'available',
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
      'SELECT * FROM boarding_houses ORDER BY top_rated DESC, rating DESC LIMIT 4'
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
        vacant, status: vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms * 0.1)) ? 'almost-full' : 'available',
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
      'SELECT bh.*, l.business_name AS owner_name, l.user_id AS owner_user_id FROM boarding_houses bh LEFT JOIN landlords l ON l.id = bh.landlord_id WHERE bh.id = ?',
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'House not found' })
    const h = rows[0]
    const [imgs] = await pool.query('SELECT image_url FROM house_images WHERE house_id = ? ORDER BY sort_order', [h.id])
    const [types] = await pool.query('SELECT DISTINCT type FROM rooms WHERE house_id = ?', [h.id])
    const vacant = Math.max(0, h.total_rooms - h.occupied_rooms)
    res.json({
      id: String(h.id), name: h.name, tagline: h.tagline || '',
      municipality: h.municipality, barangay: h.barangay, address: h.address,
      schoolNearby: typeof h.school_nearby === 'string' ? JSON.parse(h.school_nearby) : (h.school_nearby || []),
      images: imgs.map(i => i.image_url),
      description: h.description || '',
      rules: typeof h.rules === 'string' ? JSON.parse(h.rules) : (h.rules || []),
      visitorPolicy: h.visitor_policy || '', curfew: h.curfew || '',
      monthlyRent: h.monthly_rent, roomTypes: types.map(t => t.type),
      gender: h.gender, totalRooms: h.total_rooms, occupiedRooms: h.occupied_rooms,
      vacant, status: vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms * 0.1)) ? 'almost-full' : 'available',
      wifi: !!h.wifi, aircon: !!h.aircon, kitchen: !!h.kitchen, laundry: !!h.laundry,
      parking: !!h.parking, petFriendly: !!h.pet_friendly,
      rating: parseFloat(h.rating) || 0, reviewsCount: h.reviews_count || 0,
      owner: h.owner_name || '', ownerInitials: h.owner_name ? h.owner_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '',
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
      'SELECT id, room_no, type, capacity, occupied, monthly_rent, gender, aircon FROM rooms WHERE house_id = ? ORDER BY room_no',
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
      'SELECT * FROM boarding_houses WHERE id != ? AND (municipality = ? OR monthly_rent <= ?) LIMIT 3',
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
        vacant, status: vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.total_rooms * 0.1)) ? 'almost-full' : 'available',
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
   ROOMS
   ================================================================ */
app.get('/api/rooms', async (req, res) => {
  try {
    const { houseId } = req.query
    let sql = `
      SELECT r.*,
        (SELECT GROUP_CONCAT(u.name SEPARATOR ',') FROM boarder_rentals br
         JOIN users u ON u.id = br.boarder_id
         WHERE br.room_id = r.id AND br.status = 'active') AS tenant_names
      FROM rooms r
    `
    const params = []
    if (houseId) { sql += ' WHERE r.house_id = ?'; params.push(houseId) }
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
    const { houseId, roomNo, type, capacity, monthlyRent, gender, aircon } = req.body
    const [result] = await pool.query(
      'INSERT INTO rooms (house_id, room_no, type, capacity, monthly_rent, gender, aircon) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [houseId, roomNo, type, capacity || 1, monthlyRent, gender || 'mixed', aircon || false]
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
    const { roomNo, type, capacity, monthlyRent, gender, aircon } = req.body
    const fields = []
    const params = []
    if (roomNo !== undefined) { fields.push('room_no = ?'); params.push(roomNo) }
    if (type !== undefined) { fields.push('type = ?'); params.push(type) }
    if (capacity !== undefined) { fields.push('capacity = ?'); params.push(capacity) }
    if (monthlyRent !== undefined) { fields.push('monthly_rent = ?'); params.push(monthlyRent) }
    if (gender !== undefined) { fields.push('gender = ?'); params.push(gender) }
    if (aircon !== undefined) { fields.push('aircon = ?'); params.push(aircon) }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' })
    params.push(req.params.id)
    await pool.query(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, params)
    const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' })
    const r = rows[0]
    if (Number(r.capacity) > Number(r.occupied)) await notifyAvailability(r.house_id, r.room_no)
    res.json({ id: String(r.id), houseId: String(r.house_id), roomNo: r.room_no, type: r.type, capacity: r.capacity, occupied: r.occupied, monthlyRent: r.monthly_rent, gender: r.gender, aircon: !!r.aircon, tenantIds: [] })
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
    const { q, gender, roomId, houseId } = req.query
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
    if (houseId) { sql += ' AND br.house_id = ?'; params.push(houseId) }
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
    let sql = `
      SELECT p.*, u.name AS boarder_name, r.room_no
      FROM payments p
      JOIN boarder_rentals br ON br.id = p.rental_id
      JOIN users u ON u.id = br.boarder_id
      LEFT JOIN rooms r ON r.id = br.room_id
      WHERE 1=1
    `
    const params = []
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
      houseId: '',
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
    const [rows] = await pool.query('SELECT DISTINCT month_key FROM payments ORDER BY month_key DESC')
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
    const { houseId } = req.query
    const hid = houseId || 1

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
    const [payStats] = await pool.query(`
      SELECT
        SUM(CASE WHEN status IN ('paid','late') THEN amount ELSE 0 END) AS collected,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_amount,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) AS overdue_amount,
        SUM(CASE WHEN status IN ('pending','overdue') THEN 1 ELSE 0 END) AS overdue_count,
        COUNT(*) AS total_payments,
        SUM(CASE WHEN status IN ('paid','late') THEN 1 ELSE 0 END) AS paid_count,
        SUM(amount) AS expected
      FROM payments WHERE month_key = ?
    `, [monthKey])
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
      SELECT month_key AS name,
        SUM(CASE WHEN status IN ('paid','late') THEN amount ELSE 0 END) AS income,
        SUM(amount) AS expected
      FROM payments GROUP BY month_key ORDER BY month_key
    `)

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
          starter: { plan: 'Starter', price: 100, cycle: 'month', status: 'active', renewsOn: '2026-08-28', boarderLimit: 5, features: ['Basic dashboard', 'Room management', 'Payment tracking', 'PDF reports'] },
          standard: { plan: 'Standard', price: 200, cycle: 'month', status: 'active', renewsOn: '2026-08-28', boarderLimit: 15, features: ['Everything in Starter', 'Analytics & charts', 'AI Assistant', 'Smart notifications', 'Reviews management', 'Excel export'] },
          premium: { plan: 'Premium', price: 500, cycle: 'year', status: 'active', renewsOn: '', boarderLimit: null, features: ['Everything unlocked', 'Unlimited boarders', 'Advanced analytics', 'Priority support', 'Unlimited storage'] },
        }
        return res.json(planDetails[plan] || planDetails.none)
      }
    }
    // Default
    res.json({
      plan: 'Standard', price: 200, cycle: 'month', status: 'active',
      renewsOn: '2026-08-28', boarderLimit: 15,
      features: ['Everything in Starter', 'Analytics & charts', 'AI Assistant', 'Smart notifications', 'Reviews management', 'Excel export'],
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
      SELECT bh.*, l.business_name AS owner_name, l.user_id AS owner_user_id, f.created_at AS favorited_at,
        (SELECT COUNT(*) FROM rooms r WHERE r.house_id = bh.id) AS total_rooms_calc,
        (SELECT COALESCE(SUM(r.occupied), 0) FROM rooms r WHERE r.house_id = bh.id) AS occupied_rooms_calc
      FROM favorites f
      JOIN boarding_houses bh ON bh.id = f.house_id
      LEFT JOIN landlords l ON l.id = bh.landlord_id
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
    if (urows[0].role !== 'boarder') return res.status(403).json({ error: 'Not a boarder account' })

    if (name !== undefined) await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, userId])
    if (phone !== undefined) await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId])

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

    await pool.query(
      `INSERT INTO boarder_profiles (user_id, age, gender, school, course, guardian_name, guardian_phone, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE age = VALUES(age), gender = VALUES(gender), school = VALUES(school),
         course = VALUES(course), guardian_name = VALUES(guardian_name), guardian_phone = VALUES(guardian_phone), address = VALUES(address)`,
      [userId, age || null, gender || null, school || null, course || null, guardianName || null, guardianPhone || null, address || null]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Update boarder profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ================================================================
   API 404 — always answer JSON (never Express' HTML error page)
   ================================================================ */
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `API endpoint ${req.method} ${req.originalUrl} is not available on the running server. If the server was just changed, restart it (npm run dev).`,
  })
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
}

/* ================================================================
   START
   ================================================================ */
app.listen(PORT, () => {
  console.log(`🚀 BoardEase API server running on http://localhost:${PORT}`)
  ensureSchema()
})
