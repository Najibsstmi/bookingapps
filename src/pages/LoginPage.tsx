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
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1>Log Masuk</h1>
      <p>Sistem Tempahan Bilik Khas Sekolah</p>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />

        <input
          type="password"
          placeholder="Kata laluan"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, fontSize: 16 }}
        >
          {loading ? "Sedang log masuk..." : "Log Masuk"}
        </button>
      </form>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}

      <p style={{ marginTop: 16 }}>
        <Link to="/forgot-password">Lupa kata laluan?</Link>
      </p>

      <p style={{ marginTop: 20 }}>
        Belum ada akaun? <Link to="/register">Daftar di sini</Link>
      </p>
    </div>
  )
}