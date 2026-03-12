import { useState } from "react"
import { addRoom } from "../lib/roomService"

type Props = {
  schoolId: string
  onAdded: () => void
}

export default function AddRoomForm({ schoolId, onAdded }: Props) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      await addRoom(schoolId, name)
      setName("")
      setMessage("Bilik berjaya ditambah.")
      onAdded()
    } catch (error: any) {
      setMessage(error.message || "Gagal tambah bilik.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <input
        type="text"
        placeholder="Contoh: Makmal STEM"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 8, fontSize: 14 }}
      />
      <button type="submit" disabled={saving} style={{ padding: 8 }}>
        {saving ? "Menyimpan..." : "Tambah Bilik"}
      </button>
      {message && <p style={{ margin: "8px 0 0 0" }}>{message}</p>}
    </form>
  )
}
