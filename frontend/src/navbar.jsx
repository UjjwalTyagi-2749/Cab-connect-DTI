import { useNavigate } from "react-router-dom"

export default function Navbar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("cc_user"))

  const handleLogout = () => {
    localStorage.removeItem("cc_token")
    localStorage.removeItem("cc_user")
    navigate("/")
    window.location.reload()
  }

  return (
    <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 64px", height: 56, background: "white", position: "sticky", top: 0, zIndex: 1000, borderBottom: "1px solid #eee" }}>
      <div onClick={() => navigate("/")} style={{ fontSize: 18, fontWeight: 700, cursor: "pointer" }}>CabConnect</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#444" }}>👋 {user.name.split(" ")[0]}</span>
            <button onClick={handleLogout} style={{ background: "none", border: "1px solid #ddd", padding: "7px 14px", borderRadius: 20, fontWeight: 500, cursor: "pointer", fontSize: 13 }}>Log out</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", fontWeight: 500, cursor: "pointer", fontSize: 13 }}>Log in</button>
            <button onClick={() => navigate("/signup")} style={{ background: "black", color: "white", padding: "8px 16px", borderRadius: 20, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  )
}
