import { useState, type FormEvent } from "react"
import { supabase } from "../lib/supabase"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Kata laluan berjaya dikemaskini. Sila log masuk semula.")
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
        <h1>Set Kata Laluan Baru</h1>

        <form onSubmit={handleUpdatePassword} style={{ display: "grid", gap: 12 }}>
          <input
            type="password"
            placeholder="Kata laluan baru"
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
            {loading ? "Sedang simpan..." : "Simpan Kata Laluan Baru"}
          </button>
        </form>

        {message && <p style={{ marginTop: 16 }}>{message}</p>}
      </div>
    </div>
  )
}