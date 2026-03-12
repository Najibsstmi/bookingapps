import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { seedDefaultRooms } from "../lib/roomService"

type Room = {
  id: string
  school_id: string
  room_name: string
  room_category: string | null
  capacity: number | null
}

type Profile = {
  full_name: string
  email: string
  role: string
  approval_status: string
  school_id: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [roomId, setRoomId] = useState("")
  const [bookingDate, setBookingDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [purpose, setPurpose] = useState("")
  const [newRoomName, setNewRoomName] = useState("")
  const [newRoomCategory, setNewRoomCategory] = useState("")
  const [newRoomCapacity, setNewRoomCapacity] = useState("")

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, role, approval_status, school_id")
        .eq("id", user.id)
        .single()

      if (!error) {
        setProfile(data)
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  async function loadBookings(schoolId?: string) {
    if (!schoolId) {
      return
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(`
      id,
      user_id,
      booking_date,
      start_time,
      end_time,
      purpose,
      status,
      rooms (
        room_name
      )
    `)
      .eq("school_id", schoolId)
      .gte("booking_date", new Date().toISOString().split("T")[0])
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Bookings error:", error)
      return
    }

    setBookings(data || [])
  }

  async function loadRooms(schoolId?: string) {
    if (!schoolId) {
      return
    }

    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("school_id", schoolId)
      .order("room_name", { ascending: true })

    if (error) {
      console.error("Rooms error:", error)
      return
    }

    setRooms(data || [])
  }

  useEffect(() => {
    async function initSchoolData() {
      if (!profile?.school_id) {
        return
      }

      if (profile.role === "admin") {
        try {
          await seedDefaultRooms(profile.school_id)
        } catch (seedError) {
          console.error("Seed rooms error:", seedError)
        }
      }

      await loadRooms(profile.school_id)
      await loadBookings(profile.school_id)
    }

    initSchoolData()
  }, [profile?.school_id, profile?.role])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  async function cancelBooking(id: string) {
    const confirmDelete = confirm("Padam tempahan ini?")

    if (!confirmDelete) return

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Gagal padam tempahan")
      console.error(error)
    } else {
      alert("Tempahan dibatalkan")
      loadBookings(profile?.school_id)
    }
  }

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault()

    if (startTime >= endTime) {
      alert("Masa tamat mesti selepas masa mula.")
      return
    }

    if (!profile?.school_id) {
      alert("School ID tidak dijumpai.")
      return
    }

    if (!currentUserId) {
      alert("ID pengguna tidak dijumpai.")
      return
    }

    const { error } = await supabase
      .from("bookings")
      .insert({
        school_id: profile.school_id,
        room_id: roomId,
        user_id: currentUserId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        purpose: purpose,
      })

    if (error) {
      alert("Tempahan gagal: " + error.message)
      console.error("Booking error:", error)
    } else {
      alert("Tempahan berjaya")
      await loadBookings(profile.school_id)
      setRoomId("")
      setBookingDate("")
      setStartTime("")
      setEndTime("")
      setPurpose("")
    }
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault()

    if (!profile?.school_id) {
      alert("School ID tidak dijumpai.")
      return
    }

    if (!newRoomName.trim()) {
      alert("Nama bilik wajib diisi.")
      return
    }

    const { error } = await supabase
      .from("rooms")
      .insert({
        school_id: profile.school_id,
        room_name: newRoomName.trim(),
        room_category: newRoomCategory.trim() || null,
        capacity: newRoomCapacity ? Number(newRoomCapacity) : null,
        is_active: true,
      })

    if (error) {
      alert("Gagal tambah bilik: " + error.message)
      console.error(error)
      return
    }

    alert("Bilik berjaya ditambah.")
    setNewRoomName("")
    setNewRoomCategory("")
    setNewRoomCapacity("")
    await loadRooms(profile.school_id)
  }

  const cardStyle = {
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 24,
  }

  const fieldStyle = {
    width: "100%",
    maxWidth: 420,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ccc",
    marginBottom: 12,
    fontSize: 16,
  }

  const primaryButtonStyle = {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    background: "#1d3557",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  }

  const cancelButtonStyle = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#b00020",
    color: "#fff",
    cursor: "pointer",
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  if (!profile) {
    return <div style={{ padding: 24 }}>Profil tidak dijumpai.</div>
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 20px 60px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Dashboard</h1>
        <p>Selamat datang, {profile.full_name || "Pengguna"}.</p>
        <p>Email: {profile.email}</p>
        <p>Peranan: {profile.role}</p>
        <p>Status kelulusan: {profile.approval_status}</p>

        <button onClick={handleLogout} style={primaryButtonStyle}>
          Log Keluar
        </button>
      </div>

      {profile.role === "admin" && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Tambah Bilik</h2>

          <form onSubmit={handleAddRoom}>
            <input
              type="text"
              placeholder="Nama bilik"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              style={fieldStyle}
            />

            <input
              type="text"
              placeholder="Kategori bilik"
              value={newRoomCategory}
              onChange={(e) => setNewRoomCategory(e.target.value)}
              style={fieldStyle}
            />

            <input
              type="number"
              placeholder="Kapasiti"
              value={newRoomCapacity}
              onChange={(e) => setNewRoomCapacity(e.target.value)}
              style={fieldStyle}
            />

            <button type="submit" style={primaryButtonStyle}>
              Tambah Bilik
            </button>
          </form>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Senarai Bilik</h2>
        {rooms.length === 0 ? (
          <p>Belum ada bilik.</p>
        ) : (
          <ul>
            {rooms.map((room) => (
              <li key={room.id}>{room.room_name}</li>
            ))}
          </ul>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Tempah Bilik</h2>

        <form onSubmit={handleBooking}>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            style={fieldStyle}
          >
            <option value="">Pilih Bilik</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.room_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            required
            style={fieldStyle}
          />

          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            style={fieldStyle}
          />

          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            style={fieldStyle}
          />

          <textarea
            placeholder="Tujuan penggunaan bilik"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            style={fieldStyle}
          />

          <button type="submit" style={primaryButtonStyle}>
            Tempah Sekarang
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Senarai Tempahan</h2>

        {bookings.length === 0 ? (
          <p>Belum ada tempahan.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Tarikh</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Masa</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Bilik</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Tujuan</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Status</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{booking.booking_date}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                    {booking.start_time} - {booking.end_time}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                    {booking.rooms?.room_name}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                    {booking.purpose || "Tiada tujuan"}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                    {booking.status}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                    {booking.user_id === currentUserId && (
                      <button type="button" style={cancelButtonStyle} onClick={() => cancelBooking(booking.id)}>
                        Batal
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}