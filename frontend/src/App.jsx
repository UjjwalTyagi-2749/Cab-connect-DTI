import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"
import "leaflet-routing-machine"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

function MapUpdater({ markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length === 2) {
      map.eachLayer(layer => { if (layer._router) map.removeLayer(layer) })
      L.Routing.control({
        waypoints: [L.latLng(markers[0].coords), L.latLng(markers[1].coords)],
        lineOptions: { styles: [{ color: "#000000", weight: 4, opacity: 0.8 }] },
        show: false, addWaypoints: false, routeWhileDragging: false, createMarker: () => null,
      }).addTo(map)
      map.flyToBounds([markers[0].coords, markers[1].coords], { padding: [60, 60], duration: 1.5 })
    }
  }, [markers, map])
  return null
}

const PLATFORM_LINKS = {
  Ola: "https://book.olacabs.com/",
  Uber: "https://m.uber.com/ul/",
  Rapido: "https://rapido.bike/",
}

const PLATFORM_ICONS = {
  Ola: "🟡",
  Uber: "⚫",
  Rapido: "🔵",
}

export default function App() {
  const navigate = useNavigate()
  const [pickup, setPickup] = useState("")
  const [drop, setDrop] = useState("")
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mapCoords, setMapCoords] = useState([20.5937, 78.9629])
  const [markers, setMarkers] = useState([])
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [dropSuggestions, setDropSuggestions] = useState([])
  const [pickupCoordsSaved, setPickupCoordsSaved] = useState(null)
  const [dropCoordsSaved, setDropCoordsSaved] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const fetchSuggestions = async (query, setSuggestions) => {
    if (query.length < 3) return setSuggestions([])
    try {
      const res = await fetch(`http://localhost:5000/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSuggestions(data.map(d => ({ label: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) })))
    } catch (e) { console.error(e) }
  }

  const geocode = async (place) => {
    const res = await fetch(`http://localhost:5000/api/geocode?q=${encodeURIComponent(place)}`)
    const data = await res.json()
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
    return null
  }

  const handleCompare = async () => {
    if (!pickup || !drop) return alert("Please enter locations!")
    setLoading(true)
    try {
      let pCoords = pickupCoordsSaved || await geocode(pickup)
      let dCoords = dropCoordsSaved || await geocode(drop)
      if (!pCoords || !dCoords) {
        alert("Could not find locations. Please select from dropdown!")
        setLoading(false)
        return
      }
      setMapCoords([(pCoords[0] + dCoords[0]) / 2, (pCoords[1] + dCoords[1]) / 2])
      setMarkers([{ coords: pCoords, label: pickup }, { coords: dCoords, label: drop }])
      const res = await axios.post("http://localhost:5000/api/fares/compare", { pickup, drop, pickupCoords: pCoords, dropCoords: dCoords })
      setResults(res.data.results)
      setDistanceKm(res.data.distance_km)
    } catch (e) {
      console.error(e)
      alert("Backend not running! Start it with: node server.js")
    }
    setLoading(false)
  }

  const cheapest = results ? results.reduce((a, b) => a.price < b.price ? a : b) : null
  const fastest = results ? results.reduce((a, b) => a.eta_minutes < b.eta_minutes ? a : b) : null

  const SuggestionBox = ({ suggestions, onSelect }) => suggestions.length > 0 ? (
    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", borderRadius: 8, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #eee", marginTop: 4 }}>
      {suggestions.map((s, i) => (
        <div key={i} onClick={() => onSelect(s)}
          onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
          onMouseLeave={e => e.currentTarget.style.background = "white"}
          style={{ padding: "12px 16px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5" }}>
          📍 {s.label}
        </div>
      ))}
    </div>
  ) : null

  const px = isMobile ? "16px" : "64px"

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "white", color: "#000" }}>

      <style>{`
        * { box-sizing: border-box; }
        body { overflow-x: hidden; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${px}`, height: 56, background: "white", position: "sticky", top: 0, zIndex: 1000, borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 40 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>CabConnect</div>
        </div>
        
        <div style={{ display: "flex", gap: 8 }}>
          {/* LOGIN BUTTON */}
          <button 
            onClick={() => navigate("/login")} 
            style={{ background: "none", border: "none", fontWeight: 500, cursor: "pointer", fontSize: 13 }}
          >
            Log in
          </button>

          {/* SIGNUP BUTTON */}
          <button 
            onClick={() => navigate("/signup")} 
            style={{ background: "black", color: "white", padding: "8px 16px", borderRadius: 20, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", maxWidth: 1280, margin: "0 auto", borderBottom: "1px solid #eee" }}>

        {/* Left */}
        <div style={{ width: isMobile ? "100%" : 520, padding: isMobile ? "32px 16px 24px" : "48px 64px", flexShrink: 0 }}>
          <h1 style={{ fontSize: isMobile ? 32 : 52, fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-1px" }}>
            Request a ride for now or later
          </h1>

          <div style={{ background: "#f6f6f6", borderRadius: 12, padding: "4px 0", marginBottom: 16 }}>
            <div style={{ position: "relative", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid black", flexShrink: 0 }} />
              <input
                value={pickup}
                onChange={e => { setPickup(e.target.value); setPickupCoordsSaved(null); fetchSuggestions(e.target.value, setPickupSuggestions) }}
                onBlur={() => setTimeout(() => setPickupSuggestions([]), 200)}
                placeholder="Pickup location"
                style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: 15 }}
              />
              <SuggestionBox suggestions={pickupSuggestions} onSelect={s => { setPickup(s.label); setPickupCoordsSaved([s.lat, s.lon]); setPickupSuggestions([]) }} />
            </div>
            <div style={{ height: 1, background: "#eee", margin: "0 16px" }} />
            <div style={{ position: "relative", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 8, height: 8, background: "black", flexShrink: 0 }} />
              <input
                value={drop}
                onChange={e => { setDrop(e.target.value); setDropCoordsSaved(null); fetchSuggestions(e.target.value, setDropSuggestions) }}
                onBlur={() => setTimeout(() => setDropSuggestions([]), 200)}
                placeholder="Dropoff location"
                style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: 15 }}
              />
              <SuggestionBox suggestions={dropSuggestions} onSelect={s => { setDrop(s.label); setDropCoordsSaved([s.lat, s.lon]); setDropSuggestions([]) }} />
            </div>
          </div>

          <button onClick={handleCompare} style={{ width: "100%", background: "black", color: "white", padding: "14px", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer", border: "none" }}>
            {loading ? "Searching..." : "See prices"}
          </button>
        </div>

        {/* Right - Map */}
        <div style={{ flex: 1, padding: isMobile ? "0" : "48px 40px 48px 0" }}>
          <div style={{ width: "100%", height: isMobile ? 260 : 420, borderRadius: isMobile ? 0 : 16, overflow: "hidden" }}>
            <MapContainer center={mapCoords} zoom={5} style={{ width: "100%", height: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <MapUpdater markers={markers} />
              {markers.map((m, i) => (
                <Marker key={i} position={m.coords}><Popup>{m.label}</Popup></Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* RESULTS SECTION */}
      {results && (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "24px 16px" : "0 64px", marginTop: isMobile ? 0 : 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div>
              <h3 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, marginBottom: 2 }}>Available Rides</h3>
              <p style={{ fontSize: 12, color: "#666" }}>
                {pickup.split(",")[0]} → {drop.split(",")[0]}
              </p>
            </div>
            {distanceKm && (
              <span style={{ fontSize: 12, color: "#666", background: "#f6f6f6", padding: "5px 12px", borderRadius: 20, fontWeight: 500 }}>
                🛣️ {distanceKm} km by road
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 10 : 14 }}>
            {results.map((r, i) => {
              const isCheapest = cheapest.platform === r.platform && cheapest.type === r.type
              const isFastest = fastest.platform === r.platform && fastest.type === r.type
              const isHighlight = isFastest

              return (
                <div key={i}
                  onMouseEnter={e => { if (!isHighlight) e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)" }}
                  onMouseLeave={e => { if (!isHighlight) e.currentTarget.style.boxShadow = "none" }}
                  style={{
                    border: isHighlight ? "none" : "1px solid #e5e5e5",
                    borderRadius: 14,
                    padding: isMobile ? "12px" : "16px 20px",
                    background: isHighlight ? "#000" : "white",
                    color: isHighlight ? "white" : "#000",
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobile ? 8 : 12,
                    transition: "box-shadow 0.2s",
                  }}>

                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: isMobile ? 16 : 20 }}>{PLATFORM_ICONS[r.platform]}</span>
                      <div>
                        <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700 }}>{r.platform}</div>
                        <div style={{ fontSize: isMobile ? 10 : 12, color: isHighlight ? "rgba(255,255,255,0.6)" : "#888" }}>{r.type}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      {isCheapest && <span style={{ background: "#e8f5e9", color: "#2e7d32", padding: "2px 6px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>✅ Cheapest</span>}
                      {isFastest && <span style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "2px 6px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>⚡ Fastest</span>}
                    </div>
                  </div>

                  {/* Price + ETA */}
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, lineHeight: 1 }}>₹{r.price}</div>
                      {r.surge_active && (
                        <div style={{ fontSize: 9, color: isHighlight ? "rgba(255,255,255,0.5)" : "#e65100", marginTop: 2 }}>
                          🔥 Surge {r.surge_multiplier}x
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 600 }}>{r.eta_minutes} min</div>
                      <div style={{ fontSize: 10, color: isHighlight ? "rgba(255,255,255,0.5)" : "#888" }}>away</div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: isHighlight ? "rgba(255,255,255,0.1)" : "#f0f0f0" }} />

                  {/* Book Button */}
                  <button
                    onClick={() => window.open(PLATFORM_LINKS[r.platform], "_blank")}
                    style={{
                      width: "100%",
                      padding: isMobile ? "8px" : "9px",
                      borderRadius: 8,
                      border: isHighlight ? "2px solid rgba(255,255,255,0.3)" : "2px solid #000",
                      background: isHighlight ? "rgba(255,255,255,0.1)" : "#000",
                      color: "white",
                      fontWeight: 700,
                      fontSize: isMobile ? 11 : 13,
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isHighlight ? "rgba(255,255,255,0.2)" : "#333"}
                    onMouseLeave={e => e.currentTarget.style.background = isHighlight ? "rgba(255,255,255,0.1)" : "#000"}
                  >
                    Book on {r.platform} →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SUGGESTIONS SECTION */}
      <div style={{ maxWidth: 1280, margin: "48px auto 0", padding: `0 ${px}` }}>
        <h2 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 700, marginBottom: 16 }}>Suggestions</h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 20 }}>
          {[
            { title: "Ride", desc: "Go anywhere with CabConnect. Request a ride, hop in, and go.", icon: "🚗" },
            { title: "Reserve", desc: "Reserve your ride in advance so you can relax on the day of your trip.", icon: "📅" },
            { title: "Intercity", desc: "Get convenient, affordable outstation cabs anytime at your door.", icon: "🛺" },
            { title: "Parcel", desc: "CabConnect makes same-day item delivery easier than ever.", icon: "📦" },
            { title: "Rentals", desc: "Request a trip for a block of time and make multiple stops.", icon: "⏱️" },
            { title: "Bike", desc: "Get affordable motorbike rides in minutes at your doorstep.", icon: "🏍️" }
          ].map((item, i) => (
            <div key={i} style={{ background: "#f6f6f6", padding: "20px", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
              onMouseEnter={e => e.currentTarget.style.background = "#ebebeb"}
              onMouseLeave={e => e.currentTarget.style.background = "#f6f6f6"}>
              <div style={{ maxWidth: "75%" }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 12, lineHeight: 1.5 }}>{item.desc}</div>
                <button style={{ background: "white", border: "none", padding: "6px 14px", borderRadius: 20, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Details</button>
              </div>
              <div style={{ fontSize: 32 }}>{item.icon}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PLAN FOR LATER */}
      <div style={{ maxWidth: 1280, margin: "60px auto 0", padding: `0 ${px}` }}>
        <h2 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 700, marginBottom: 20 }}>Plan for later</h2>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 24 : 40, alignItems: "flex-start" }}>
          <div style={{ flex: 2, background: "#E2F0F1", borderRadius: 16, padding: isMobile ? "24px" : "40px", position: "relative", overflow: "hidden", minHeight: isMobile ? 240 : 300 }}>
            <h3 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 700, marginBottom: 16 }}>Get your ride right<br />with CabConnect Reserve</h3>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginBottom: 16 }}>
              <input type="date" style={{ padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14, width: isMobile ? "100%" : "auto" }} />
              <input type="time" style={{ padding: "10px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14, width: isMobile ? "100%" : "auto" }} />
            </div>
            <button style={{ background: "black", color: "white", padding: "10px 28px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" }}>Next</button>
            <div style={{ position: "absolute", bottom: -20, right: 20, fontSize: isMobile ? 80 : 120, opacity: 0.15 }}>🕒</div>
          </div>
          <div style={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
            <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Benefits</h4>
            {[
              { icon: "📅", text: "Choose your exact pickup time up to 90 days in advance." },
              { icon: "⏱️", text: "Extra wait time included to meet your ride." },
              { icon: "💳", text: "Cancel at no charge up to 60 minutes in advance." }
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 18 }}>{b.icon}</div>
                <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{b.text}</div>
              </div>
            ))}
            <a href="#" style={{ color: "black", fontSize: 13, textDecoration: "underline" }}>See terms</a>
          </div>
        </div>
      </div>

      {/* PROMO - CabConnect One */}
      <div style={{ background: "black", color: "white", padding: isMobile ? "48px 0" : "80px 0", marginTop: 60 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: `0 ${px}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 700, marginBottom: 12 }}>CabConnect One</h2>
            <p style={{ fontSize: isMobile ? 14 : 16, marginBottom: 20, opacity: 0.8, lineHeight: 1.6 }}>One membership for member pricing and experiences on rides, deliveries, and more.</p>
            <button style={{ background: "white", color: "black", padding: "10px 20px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" }}>Try it now</button>
          </div>
          <div style={{ fontSize: isMobile ? 56 : 80 }}>🎟️</div>
        </div>
      </div>

      {/* RIDE WITH FRIENDS */}
      <div style={{ maxWidth: 1280, margin: "60px auto", padding: `0 ${px}`, display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 24 : 80, alignItems: "center" }}>
        <div style={{ flex: 1, background: "#f6f6f6", borderRadius: 16, height: isMobile ? 180 : 300, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 64 : 100, width: "100%" }}>👥</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: isMobile ? 22 : 36, fontWeight: 700, marginBottom: 12 }}>Ride with friends seamlessly</h2>
          <p style={{ fontSize: isMobile ? 14 : 16, color: "#555", lineHeight: 1.6, marginBottom: 20 }}>Riding with friends just got easier: set up a group ride in the CabConnect app, invite your friends, and arrive at your destination. Friends who ride together save together.</p>
          <a href="#" style={{ color: "black", fontWeight: 600, textDecoration: "underline", fontSize: 14 }}>Learn more</a>
        </div>
      </div>

      <div style={{ height: 60 }} />

      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}