import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import AppHeader from "../components/AppHeader"
import { supabase } from "../lib/supabase"
import { seedDefaultRooms } from "../lib/roomService"

type Profile = {
  id: string
  full_name: string | null
  email: string
  role: "guru" | "admin" | "pengetua" | "penolong_kanan"
  approval_status: string
  school_id: string | null
}

type Room = {
  id: string
  school_id: string
  room_name: string
  room_category: string | null
  capacity: number | null
  is_active: boolean
}

export default function AdminRoomsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoomName, setNewRoomName] = useState("")
  const [newRoomCategory, setNewRoomCategory] = useState("")
  const [newRoomCapacity, setNewRoomCapacity] = useState("")
  const [message, setMessage] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("")

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, approval_status, school_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profileData) {
        setLoading(false)
        return
      }

      setProfile(profileData as Profile)

      if (profileData.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("school_name, logo_url")
          .eq("id", profileData.school_id)
          .single()

        if (!schoolError && schoolData) {
          setSchoolName(schoolData.school_name || "")
          setSchoolLogoUrl(schoolData.logo_url || "")
        }

        if (profileData.role === "admin") {
          try {
            await seedDefaultRooms(profileData.school_id)
          } catch (err) {
            console.error("Seed rooms error:", err)
          }
        }

        await loadRooms(profileData.school_id)
      }

      setLoading(false)
    }

    init()
  }, [])

  async function loadRooms(schoolId: string) {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, school_id, room_name, room_category, capacity, is_active")
      .eq("school_id", schoolId)
      .order("room_name", { ascending: true })

    if (error) {
      console.error("Gagal ambil bilik:", error)
      setRooms([])
      return
    }

    setRooms((data ?? []) as Room[])
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

    const { error } = await supabase.from("rooms").insert({
      school_id: profile.school_id,
      room_name: newRoomName.trim(),
      room_category: newRoomCategory.trim() || null,
      capacity: newRoomCapacity ? Number(newRoomCapacity) : null,
      is_active: true,
    })

    if (error) {
      alert("Gagal tambah bilik: " + error.message)
      return
    }

    setMessage("Bilik berjaya ditambah.")
    setNewRoomName("")
    setNewRoomCategory("")
    setNewRoomCapacity("")
    await loadRooms(profile.school_id)
  }

  async function toggleRoom(roomId: string, currentStatus: boolean) {
    const confirmed = window.confirm(
      currentStatus ? "Nyahaktifkan bilik ini?" : "Aktifkan semula bilik ini?"
    )
    if (!confirmed) return

    const { error } = await supabase
      .from("rooms")
      .update({ is_active: !currentStatus })
      .eq("id", roomId)

    if (error) {
      alert("Gagal kemaskini bilik.")
      return
    }

    if (profile?.school_id) {
      await loadRooms(profile.school_id)
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (profile.role !== "admin" && profile.role !== "pengetua") {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        <p>Anda tiada akses ke halaman ini.</p>
        <Link to="/dashboard">← Kembali ke Dashboard</Link>
      </div>
    )
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 24,
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ccc",
    marginBottom: 12,
    fontSize: 16,
  }

  const buttonStyle: React.CSSProperties = {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    background: "#1d3557",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 14,
  }

  const tdStyle: React.CSSProperties = {
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 24 }}>
      <AppHeader
        schoolName={schoolName}
        schoolLogoUrl={schoolLogoUrl}
        role={profile?.role}
      />

      <Link
        to="/dashboard"
        style={{
          display: "inline-block",
          marginBottom: 16,
          textDecoration: "none",
          color: "#16325B",
          fontWeight: 600,
        }}
      >
        ← Kembali ke Dashboard
      </Link>

      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Pengurusan Bilik</h1>
        <p>Tambah bilik baru dan urus status aktif bilik sekolah.</p>
        {message ? <p style={{ color: "#15803d" }}>{message}</p> : null}
      </div>

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
          <button type="submit" style={buttonStyle}>
            Tambah Bilik
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Senarai Bilik</h2>

        {rooms.length === 0 ? (
          <p>Belum ada bilik.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nama Bilik</th>
                  <th style={thStyle}>Kategori</th>
                  <th style={thStyle}>Kapasiti</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td style={tdStyle}>{room.room_name}</td>
                    <td style={tdStyle}>{room.room_category || "-"}</td>
                    <td style={tdStyle}>{room.capacity ?? "-"}</td>
                    <td style={tdStyle}>
                      {room.is_active ? "Aktif" : "Tidak Aktif"}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleRoom(room.id, room.is_active)}
                        style={{
                          ...buttonStyle,
                          background: room.is_active ? "#b91c1c" : "#15803d",
                          padding: "8px 12px",
                        }}
                      >
                        {room.is_active ? "Nyahaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
