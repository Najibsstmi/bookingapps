import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Email reset password telah dihantar. Sila semak inbox anda.")
    }

    setLoading(false)
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
        <h1>Lupa Kata Laluan</h1>
        <p>Masukkan email anda untuk reset kata laluan.</p>

        <form onSubmit={handleReset} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Sedang hantar..." : "Hantar Email Reset"}
          </button>
        </form>

        {message && <p style={{ marginTop: 16 }}>{message}</p>}

        <p style={{ marginTop: 20 }}>
          Kembali ke <Link to="/login">Log Masuk</Link>
        </p>
      </div>
    </div>
  )
}