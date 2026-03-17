import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import AppHeader from "../components/AppHeader"
import { supabase } from "../lib/supabase"

type Profile = {
  id: string
  role: string
  approval_status: string
  school_id: string
}

type RoomUsage = {
  roomName: string
  count: number
}

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [schoolName, setSchoolName] = useState("")
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("")
  const [activeRoomsCount, setActiveRoomsCount] = useState(0)
  const [topRoom, setTopRoom] = useState("Belum ada data")
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState(0)
  const [roomUsage, setRoomUsage] = useState<RoomUsage[]>([])

  useEffect(() => {
    async function loadAnalysis() {
      setLoading(true)
      setMessage("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMessage("Sesi tidak dijumpai.")
        setLoading(false)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, approval_status, school_id")
        .eq("id", user.id)
        .single<Profile>()

      if (profileError || !profileData) {
        setMessage("Profil pengguna tidak dijumpai.")
        setLoading(false)
        return
      }

      setProfile(profileData)

      const allowedRoles = ["admin", "pengetua", "penolong_kanan"]
      if (
        profileData.approval_status !== "approved" ||
        !allowedRoles.includes(profileData.role)
      ) {
        setMessage("Anda tidak mempunyai akses ke halaman analisis.")
        setLoading(false)
        return
      }

      if (!profileData.school_id) {
        setMessage("Maklumat sekolah tidak lengkap.")
        setLoading(false)
        return
      }

      const [schoolResponse, roomsResponse, bookingsResponse] = await Promise.all([
        supabase
          .from("schools")
          .select("school_name, logo_url")
          .eq("id", profileData.school_id)
          .single(),
        supabase
          .from("rooms")
          .select("id")
          .eq("school_id", profileData.school_id)
          .eq("is_active", true),
        supabase
          .from("bookings")
          .select("id, booking_date, status, rooms!bookings_room_id_fkey(room_name)")
          .eq("school_id", profileData.school_id),
      ])

      if (!schoolResponse.error && schoolResponse.data) {
        setSchoolName(schoolResponse.data.school_name || "")
        setSchoolLogoUrl(schoolResponse.data.logo_url || "")
      }

      if (roomsResponse.error) {
        setMessage("Gagal memuatkan analisis bilik.")
        setLoading(false)
        return
      }

      if (bookingsResponse.error) {
        setMessage("Gagal memuatkan analisis tempahan.")
        setLoading(false)
        return
      }

      const roomsData = roomsResponse.data || []
      const bookingsData = bookingsResponse.data || []

      setActiveRoomsCount(roomsData.length)

      const filteredBookings = bookingsData.filter(
        (booking: any) => booking.status !== "cancelled"
      )

      const today = new Date().toISOString().split("T")[0]
      const upcomingCount = filteredBookings.filter(
        (booking: any) => booking.booking_date >= today
      ).length
      setUpcomingBookingsCount(upcomingCount)

      const roomCountMap: Record<string, number> = {}
      filteredBookings.forEach((booking: any) => {
        const roomName = booking.rooms?.room_name
        if (!roomName) return
        roomCountMap[roomName] = (roomCountMap[roomName] || 0) + 1
      })

      const sortedUsage = Object.entries(roomCountMap)
        .sort((a, b) => b[1] - a[1])
        .map(([roomName, count]) => ({ roomName, count }))

      if (sortedUsage.length > 0) {
        setTopRoom(`${sortedUsage[0].roomName} (${sortedUsage[0].count})`)
      } else {
        setTopRoom("Belum ada data")
      }

      setRoomUsage(sortedUsage.slice(0, 5))
      setLoading(false)
    }

    loadAnalysis()
  }, [])

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 20,
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
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
      <AppHeader schoolName={schoolName} schoolLogoUrl={schoolLogoUrl} role={profile?.role} />

      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Analisis Sekolah</h1>
        <p style={{ color: "#475569" }}>
          Ringkasan prestasi penggunaan bilik untuk sekolah anda.
        </p>

        <Link
          to="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#16325B",
            color: "#fff",
            textDecoration: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Kembali ke Dashboard
        </Link>
      </div>

      {message ? (
        <div style={cardStyle}>
          <p style={{ margin: 0 }}>{message}</p>
        </div>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={cardStyle}>
              <p style={{ margin: 0, color: "#64748b" }}>Jumlah Bilik Aktif</p>
              <h2 style={{ margin: "8px 0 0 0" }}>{activeRoomsCount}</h2>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: 0, color: "#64748b" }}>Bilik Paling Kerap Digunakan</p>
              <h2 style={{ margin: "8px 0 0 0", fontSize: 22 }}>{topRoom}</h2>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: 0, color: "#64748b" }}>Tempahan Akan Datang</p>
              <h2 style={{ margin: "8px 0 0 0" }}>{upcomingBookingsCount}</h2>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>5 Bilik Paling Banyak Tempahan</h2>
            {roomUsage.length === 0 ? (
              <p style={{ marginBottom: 0, color: "#64748b" }}>Belum ada data tempahan.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {roomUsage.map((item, index) => (
                  <div
                    key={item.roomName}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {index + 1}. {item.roomName}
                    </div>
                    <div style={{ color: "#334155", fontWeight: 600 }}>{item.count} tempahan</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
