require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()
app.use(cors())
app.use(express.json())

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB error:', err))

// --- User Schema ---
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)

// --- Auth Middleware ---
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// --- Routes ---
app.get('/', (req, res) => {
  res.send('Backend is alive! 🚕')
})

// SIGNUP
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body
  try {
    // Check if user already exists
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ error: 'Email already registered' })

    // Hash password
    const hashed = await bcrypt.hash(password, 10)

    // Save user
    const user = await User.create({ name, email, password: hashed })

    // Generate token
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  try {
    // Find user
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: 'No account found with this email' })

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' })

    // Generate token
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET current user (protected route)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json({ user })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Geocode ---
app.get('/api/geocode', async (req, res) => {
  const { q } = req.query
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q, format: 'json', limit: 5, countrycodes: 'in' },
      headers: { 'User-Agent': 'CabConnect/1.0' }
    })
    res.json(response.data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Helpers ---
async function getRoadDistanceKm(pickupCoords, dropCoords) {
  const [pLat, pLon] = pickupCoords
  const [dLat, dLon] = dropCoords
  const url = `http://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${dLon},${dLat}?overview=false`
  const response = await axios.get(url)
  const meters = response.data.routes[0].distance
  return meters / 1000
}

function getSurgeMultiplier() {
  const hour = new Date().getHours()
  const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)
  if (!isPeak) return 1.0
  return parseFloat((1.1 + Math.random() * 0.4).toFixed(2))
}

function calculateFare(baseFare, perKmRate, distanceKm, minFare, surge) {
  const raw = (baseFare + perKmRate * distanceKm) * surge
  return Math.max(Math.round(raw), minFare)
}

function calculateETA(baseETA) {
  return Math.max(1, baseETA + Math.floor(Math.random() * 5) - 2)
}

// --- Fare Compare ---
app.post('/api/fares/compare', async (req, res) => {
  const { pickup, drop, pickupCoords, dropCoords } = req.body
  if (!pickupCoords || !dropCoords) {
    return res.status(400).json({ error: 'pickupCoords and dropCoords are required' })
  }
  try {
    const distanceKm = await getRoadDistanceKm(pickupCoords, dropCoords)
    const surge = getSurgeMultiplier()
    const platforms = [
      { platform: 'Ola', type: 'Ola Mini', baseFare: 40, perKmRate: 11, minFare: 80, baseETA: 4 },
      { platform: 'Ola', type: 'Ola Prime Sedan', baseFare: 50, perKmRate: 14, minFare: 100, baseETA: 6 },
      { platform: 'Uber', type: 'Uber Go', baseFare: 45, perKmRate: 12, minFare: 90, baseETA: 3 },
      { platform: 'Uber', type: 'Uber Premier', baseFare: 55, perKmRate: 16, minFare: 120, baseETA: 7 },
      { platform: 'Rapido', type: 'Rapido Bike', baseFare: 20, perKmRate: 7, minFare: 40, baseETA: 2 },
      { platform: 'Rapido', type: 'Rapido Auto', baseFare: 25, perKmRate: 9, minFare: 60, baseETA: 5 },
    ]
    const results = platforms.map(p => ({
      platform: p.platform,
      type: p.type,
      price: calculateFare(p.baseFare, p.perKmRate, distanceKm, p.minFare, surge),
      eta_minutes: calculateETA(p.baseETA),
      surge_active: surge > 1.0,
      surge_multiplier: surge,
      distance_km: parseFloat(distanceKm.toFixed(2)),
    }))
    res.json({ success: true, results, distance_km: parseFloat(distanceKm.toFixed(2)) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to calculate fares: ' + e.message })
  }
})

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 5000}`)
})