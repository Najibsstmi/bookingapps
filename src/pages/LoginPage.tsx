import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    window.location.assign("/dashboard")
  }

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
      <img
        src="/eduslot-logo.png"
        alt="Logo EduSlot"
        style={{
          width: 120,
          height: 120,
          objectFit: "contain",
          display: "block",
          margin: "0 auto 12px",
        }}
      />
      <h1>Log Masuk</h1>
      <h1 style={{ marginTop: 0 }}>EduSlot</h1>
      <p>Sistem Tempahan Bilik Khas Sekolah</p>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "12px", fontSize: 16, borderRadius: 10, border: "1px solid #cbd5e1", width: "100%" }}
        />

        <input
          type="password"
          placeholder="Kata laluan"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "12px", fontSize: 16, borderRadius: 10, border: "1px solid #cbd5e1", width: "100%" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            minHeight: "44px",
            borderRadius: "10px",
            fontSize: "15px",
            padding: "12px 16px",
            background: "#16325B",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "Sedang log masuk..." : "Log Masuk"}
        </button>
      </form>

      {message && <p style={{ marginTop: 16, color: "#dc2626" }}>{message}</p>}

      <p style={{ marginTop: 16 }}>
        <Link to="/forgot-password">Lupa kata laluan?</Link>
      </p>

      <p style={{ marginTop: 20 }}>
        Belum ada akaun? <Link to="/register">Daftar di sini</Link>
      </p>
      </div>
    </div>
  )
}