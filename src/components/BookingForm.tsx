import { useEffect, useState } from "react"
import { getRoomsBySchool } from "../lib/roomService"
import { createBooking } from "../lib/bookingService"

type Room = {
  id: string
  name: string
}

type Props = {
  schoolId: string
  userId: string
}

export default function BookingForm({ schoolId, userId }: Props) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomId, setRoomId] = useState("")
  const [bookingDate, setBookingDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [purpose, setPurpose] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await getRoomsBySchool(schoolId)
        setRooms(data || [])
      } catch (error) {
        console.error("Error loading rooms:", error)
      }
    }

    loadRooms()
  }, [schoolId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      await createBooking({
        schoolId,
        roomId,
        userId,
        bookingDate,
        startTime,
        endTime,
        purpose,
      })

      setMessage("Tempahan berjaya direkodkan.")
      setRoomId("")
      setBookingDate("")
      setStartTime("")
      setEndTime("")
      setPurpose("")
    } catch (error: any) {
      setMessage(error.message || "Tempahan gagal.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <select
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        required
        style={{ padding: 8, fontSize: 14 }}
      >
        <option value="">Pilih bilik</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={bookingDate}
        onChange={(e) => setBookingDate(e.target.value)}
        required
        style={{ padding: 8, fontSize: 14 }}
      />

      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        required
        style={{ padding: 8, fontSize: 14 }}
      />

      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        required
        style={{ padding: 8, fontSize: 14 }}
      />

      <textarea
        placeholder="Tujuan penggunaan bilik"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        style={{ padding: 8, fontSize: 14 }}
      />

      <button type="submit" disabled={saving} style={{ padding: 8 }}>
        {saving ? "Menyimpan..." : "Tempah Sekarang"}
      </button>

      {message && <p style={{ margin: "8px 0 0 0" }}>{message}</p>}
    </form>
  )
}
