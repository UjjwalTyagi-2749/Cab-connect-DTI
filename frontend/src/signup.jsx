import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setError("")
    if (!form.name || !form.email || !form.password) return setError("Please fill in all fields")
    if (form.password.length < 6) return setError("Password must be at least 6 characters")
    setLoading(true)
    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup", form)
      localStorage.setItem("cc_token", res.data.token)
      localStorage.setItem("cc_user", JSON.stringify(res.data.user))
      navigate("/")
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong")
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "white" }}>

      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 64px", height: 56, borderBottom: "1px solid #eee" }}>
        <div onClick={() => navigate("/")} style={{ fontSize: 18, fontWeight: 700, cursor: "pointer" }}>CabConnect</div>
        <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", fontWeight: 500, cursor: "pointer", fontSize: 13 }}>Log in</button>
      </nav>

      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Create account</h1>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 32 }}>Sign up to get started with CabConnect</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ padding: "13px 16px", borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 15, outline: "none", width: "100%" }}
            />
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ padding: "13px 16px", borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 15, outline: "none", width: "100%" }}
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleSignup()}
              style={{ padding: "13px 16px", borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 15, outline: "none", width: "100%" }}
            />

            {error && (
              <div style={{ background: "#fff3f3", color: "#c62828", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              style={{ background: "black", color: "white", padding: "13px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "#888" }}>
              Already have an account?{" "}
              <span onClick={() => navigate("/login")} style={{ color: "black", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                Log in
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}