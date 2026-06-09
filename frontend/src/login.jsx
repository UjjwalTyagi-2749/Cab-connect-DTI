import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError("")
    if (!form.email || !form.password) return setError("Please fill in all fields")
    setLoading(true)
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form)
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
        <button onClick={() => navigate("/signup")} style={{ background: "black", color: "white", padding: "8px 16px", borderRadius: 20, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Sign up</button>
      </nav>

      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 32 }}>Log in to your CabConnect account</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ padding: "13px 16px", borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 15, outline: "none", width: "100%" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ padding: "13px 16px", borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 15, outline: "none", width: "100%" }}
            />

            {error && (
              <div style={{ background: "#fff3f3", color: "#c62828", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ background: "black", color: "white", padding: "13px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>
              {loading ? "Logging in..." : "Log in"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "#888" }}>
              Don't have an account?{" "}
              <span onClick={() => navigate("/signup")} style={{ color: "black", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                Sign up
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}