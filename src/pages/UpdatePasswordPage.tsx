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
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1>Set Kata Laluan Baru</h1>

      <form onSubmit={handleUpdatePassword} style={{ display: "grid", gap: 12 }}>
        <input
          type="password"
          placeholder="Kata laluan baru"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />

        <button type="submit" disabled={loading} style={{ padding: 12, fontSize: 16 }}>
          {loading ? "Sedang simpan..." : "Simpan Kata Laluan Baru"}
        </button>
      </form>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </div>
  )
}