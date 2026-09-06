import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pool from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(cors())
app.use(express.json())

/* ================================================================
   AUTH
   ================================================================ */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const [rows] = await pool.query(
      'SELECT id, email, name, role, avatar_color, phone FROM users WHERE email = ? AND password = ?',
      [email, password]
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
   HOUSES (Boarding Houses)
   ================================================================ */
app.get('/api/houses', async (req, res) => {
  try {
    const {
      municipality, barangay, school, maxRent, gender,
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
      'SELECT bh.*, l.business_name AS owner_name FROM boarding_houses bh LEFT JOIN landlords l ON l.id = bh.landlord_id WHERE bh.id = ?',
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
      SELECT u.id, u.name, u.avatar_color, u.phone, bp.age, bp.gender AS gender_val,
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
      SELECT rv.*, u.name AS author_name, u.avatar_color
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
      date: new Date(r.created_at).toISOString().slice(0, 10),
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
   START
   ================================================================ */
app.listen(PORT, () => {
  console.log(`🚀 BoardEase API server running on http://localhost:${PORT}`)
})
