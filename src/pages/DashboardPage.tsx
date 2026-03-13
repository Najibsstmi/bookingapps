import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { seedDefaultRooms } from "../lib/roomService"
import { createNotification } from "../lib/notificationService"

type Room = {
  id: string
  school_id: string
  room_name: string
  room_category: string | null
  capacity: number | null
  is_active?: boolean
}

type Profile = {
  id: string
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
  const [roomBookings, setRoomBookings] = useState<any[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [stats, setStats] = useState({
    totalRooms: 0,
    upcomingBookings: 0,
    topRoom: "",
  })
  const [notifications, setNotifications] = useState<any[]>([])
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [roomId, setRoomId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
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

      console.log("SESSION USER:", user)

      if (!user) {
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, approval_status, school_id")
        .eq("id", user.id)
        .single()

      console.log("PROFILE DATA:", profileData)
      console.log("PROFILE ERROR:", profileError)

      if (!profileError) {
        setProfile(profileData)
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  async function loadBookings(schoolIdValue: string, currentUserId?: string, currentRole?: string) {
    let query = supabase
      .from("bookings")
      .select(`
    id,
    school_id,
    room_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    purpose,
    status,
    cancel_reason,
    rooms!bookings_room_id_fkey (
      room_name
    )
  `)
      .eq("school_id", schoolIdValue)
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (currentRole === "guru" && currentUserId) {
      query = query.eq("user_id", currentUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Ralat load bookings:", error)
      setBookings([])
      return
    }

    const bookingsData = data || []
    const userIds = [...new Set(bookingsData.map((b: any) => b.user_id).filter(Boolean))]

    if (userIds.length === 0) {
      setBookings(bookingsData)
      return
    }

    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)

    if (profilesError) {
      console.error("Profiles error:", profilesError)
      const fallbackBookings = bookingsData.map((booking: any) => ({
        ...booking,
        teacher_name: booking.user_id || "Pengguna",
      }))
      setBookings(fallbackBookings)
      return
    }

    const profileMap = new Map((profileRows || []).map((p: any) => [p.id, p.full_name]))

    const mergedBookings = bookingsData.map((booking: any) => ({
      ...booking,
      teacher_name: profileMap.get(booking.user_id) || booking.user_id,
    }))

    setBookings(mergedBookings)
  }

  async function loadRooms(schoolId?: string) {
    if (!schoolId) {
      return
    }

    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("room_name", { ascending: true })

    if (error) {
      console.error("Rooms error:", error)
      return
    }

    setRooms(data || [])
  }

  const loadPendingUsers = async (schoolId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, approval_status, school_id")
      .eq("school_id", schoolId)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Ralat load pending users:", error)
      return
    }

    setPendingUsers(data || [])
  }

  async function loadNotifications() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user

    if (!user) return

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Notifications error:", error)
      return
    }

    setNotifications(data || [])
  }

  async function notifyBookingCreated({
    schoolId,
    bookingDate,
    startTime,
    endTime,
    roomName,
    teacherName,
    teacherId,
  }: {
    schoolId: string
    bookingDate: string
    startTime: string
    endTime: string
    roomName: string
    teacherName: string
    teacherId: string
  }) {
    const { data: approvers, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("school_id", schoolId)
      .in("role", ["admin", "pengetua", "penolong_kanan"])

    if (error) {
      console.error("Approver notification error:", error)
      return
    }

    const approverNotifications =
      approvers?.map((person: any) =>
        createNotification({
          userId: person.id,
          title: "Tempahan baharu",
          message: `${teacherName} membuat tempahan ${roomName} pada ${bookingDate}, ${startTime} - ${endTime}.`,
        })
      ) || []

    const teacherNotification = createNotification({
      userId: teacherId,
      title: "Tempahan berjaya dihantar",
      message: `Tempahan anda untuk ${roomName} pada ${bookingDate}, ${startTime} - ${endTime} sedang menunggu kelulusan.`,
    })

    await Promise.all([...approverNotifications, teacherNotification])
  }

  async function notifyBookingApproved(booking: any) {
    await createNotification({
      userId: booking.user_id,
      title: "Tempahan diluluskan",
      message: `Tempahan anda untuk ${booking.rooms?.room_name || "bilik"} pada ${booking.booking_date}, ${booking.start_time} - ${booking.end_time} telah diluluskan.`,
    })
  }

  async function notifyBookingCancelled(booking: any, reason: string) {
    await createNotification({
      userId: booking.user_id,
      title: "Tempahan dibatalkan",
      message: `Tempahan anda untuk ${booking.rooms?.room_name || "bilik"} pada ${booking.booking_date}, ${booking.start_time} - ${booking.end_time} telah dibatalkan. Sebab: ${reason}`,
    })
  }

  async function loadStats(currentSchoolId?: string) {
    const schoolIdToUse = currentSchoolId || profile?.school_id

    if (!schoolIdToUse) return

    const today = new Date().toISOString().split("T")[0]

    const activeRooms = rooms.filter((room: any) => room.is_active !== false)

    const upcoming = bookings.filter(
      (booking: any) => booking.booking_date >= today
    )

    const roomCountMap: Record<string, number> = {}

    bookings.forEach((booking: any) => {
      const roomName = booking.rooms?.room_name
      if (!roomName) return

      roomCountMap[roomName] = (roomCountMap[roomName] || 0) + 1
    })

    let topRoom = ""
    let maxCount = 0

    Object.entries(roomCountMap).forEach(([roomName, count]) => {
      if (count > maxCount) {
        maxCount = count
        topRoom = `${roomName} (${count})`
      }
    })

    setStats({
      totalRooms: activeRooms.length,
      upcomingBookings: upcoming.length,
      topRoom: topRoom || "Belum ada data",
    })
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
      await loadBookings(profile.school_id, profile.id, profile.role)
      await loadNotifications()

      if (
        profile.role === "admin" ||
        profile.role === "pengetua" ||
        profile.role === "penolong_kanan"
      ) {
        await loadPendingUsers(profile.school_id)
      } else {
        setPendingUsers([])
      }
    }

    initSchoolData()
  }, [profile?.id, profile?.school_id, profile?.role])

  const categories = [...new Set(
    rooms
      .map((room) => room.room_category)
      .filter((category): category is string => Boolean(category))
  )].sort((a, b) => a.localeCompare(b))

  const filteredRooms = selectedCategory
    ? rooms
        .filter((room) => room.room_category === selectedCategory)
        .sort((a, b) => a.room_name.localeCompare(b.room_name))
    : []

  const timeSlots = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
  ]

  useEffect(() => {
    setRoomId("")
  }, [selectedCategory])

  useEffect(() => {
    if (!roomId || !bookingDate) {
      setRoomBookings([])
      return
    }

    const loadRoomBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          start_time,
          end_time,
          booking_date,
          profiles (
            full_name
          )
        `)
        .eq("room_id", roomId)
        .eq("booking_date", bookingDate)
        .order("start_time", { ascending: true })

      if (!error) {
        setRoomBookings(data || [])
      }
    }

    loadRoomBookings()
  }, [roomId, bookingDate])

  useEffect(() => {
    loadStats()
  }, [rooms, bookings])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const approveUser = async (userId: string) => {
    const confirmed = window.confirm("Luluskan pengguna ini?")
    if (!confirmed) return

    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", userId)

    if (error) {
      alert("Gagal meluluskan pengguna.")
      console.error(error)
      return
    }

    alert("Pengguna berjaya diluluskan.")

    if (profile?.school_id) {
      await loadPendingUsers(profile.school_id)
    }
  }

  async function approveBooking(booking: any) {
    const confirmApprove = confirm("Luluskan tempahan ini?")

    if (!confirmApprove) return

    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData?.user

    const { data: clashBookings, error: clashError } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", booking.room_id)
      .eq("booking_date", booking.booking_date)
      .eq("status", "approved")
      .neq("id", booking.id)
      .lt("start_time", booking.end_time)
      .gt("end_time", booking.start_time)

    if (clashError) {
      alert("Gagal semak pertindihan tempahan.")
      console.error(clashError)
      return
    }

    if (clashBookings && clashBookings.length > 0) {
      alert("Tempahan ini tidak boleh diluluskan kerana bertindih dengan tempahan yang sudah diluluskan.")
      return
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "approved",
        approved_by: currentUser?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", booking.id)

    if (error) {
      alert("Gagal meluluskan tempahan")
      console.error(error)
      return
    }

    await notifyBookingApproved(booking)

    const { data: overlappingPending, error: pendingError } = await supabase
      .from("bookings")
      .select("id, user_id, booking_date, start_time, end_time, rooms(room_name)")
      .eq("room_id", booking.room_id)
      .eq("booking_date", booking.booking_date)
      .eq("status", "pending")
      .neq("id", booking.id)
      .lt("start_time", booking.end_time)
      .gt("end_time", booking.start_time)

    if (!pendingError && overlappingPending && overlappingPending.length > 0) {
      const ids = overlappingPending.map((b: any) => b.id)

      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_by: currentUser?.id || null,
          cancelled_at: new Date().toISOString(),
          cancel_reason: "Dibatalkan automatik kerana slot telah diluluskan untuk tempahan lain.",
        })
        .in("id", ids)
    }

    if (profile?.school_id) {
      await loadBookings(profile.school_id, profile.id, profile.role)
    }
    await loadNotifications()
  }

  async function cancelBooking(booking: any) {
    const reason = prompt("Nyatakan sebab pembatalan")

    if (!reason) return

    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData?.user

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_by: currentUser?.id || null,
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      })
      .eq("id", booking.id)

    if (error) {
      alert("Gagal batalkan tempahan")
      console.error(error)
      return
    }

    await notifyBookingCancelled(booking, reason)
    if (profile?.school_id) {
      await loadBookings(profile.school_id, profile.id, profile.role)
    }
    await loadNotifications()
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

    const { data: clashes, error: clashError } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", roomId)
      .eq("booking_date", bookingDate)
      .eq("status", "approved")
      .lt("start_time", endTime)
      .gt("end_time", startTime)

    if (clashError) {
      alert("Gagal semak pertindihan tempahan.")
      console.error(clashError)
      return
    }

    if (clashes && clashes.length > 0) {
      alert("Slot ini sudah bertindih dengan tempahan yang telah diluluskan.")
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
        status: "pending",
      })

    if (error) {
      alert("Tempahan gagal: " + error.message)
      console.error("Booking error:", error)
    } else {
      const selectedRoom = rooms.find((room: any) => room.id === roomId)

      await notifyBookingCreated({
        schoolId: profile.school_id,
        bookingDate,
        startTime,
        endTime,
        roomName: selectedRoom?.room_name || "Bilik",
        teacherName: profile.full_name || "Pengguna",
        teacherId: profile.id,
      })

      alert("Tempahan berjaya")
      await loadBookings(profile.school_id, profile.id, profile.role)
      await loadNotifications()
      setSelectedSlots([])
      setSelectedCategory("")
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

  async function toggleRoom(roomId: string, currentStatus: boolean) {
    const confirmAction = confirm(
      currentStatus
        ? "Nyahaktifkan bilik ini?"
        : "Aktifkan semula bilik ini?"
    )

    if (!confirmAction) return

    const { error } = await supabase
      .from("rooms")
      .update({
        is_active: !currentStatus,
      })
      .eq("id", roomId)

    if (error) {
      alert("Gagal kemaskini bilik")
      return
    }

    await loadRooms(profile?.school_id)
  }

  const cardStyle = {
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: 24,
  }

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role === "pengetua" ||
    profile?.role === "penolong_kanan"

  const isGuru = profile?.role === "guru"

  const isApproved = profile?.approval_status === "approved"

  const isPending = profile?.approval_status === "pending"

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

  function isSlotBooked(slotStart: string) {
    const slotIndex = timeSlots.indexOf(slotStart)
    const slotEnd = timeSlots[slotIndex + 1]

    if (!slotEnd) return null

    const booking = roomBookings.find((b: any) => {
      return b.start_time.slice(0, 5) <= slotStart && b.end_time.slice(0, 5) > slotStart
    })

    if (booking) {
      return {
        booked: true,
        end: slotEnd,
        name: booking.profiles?.full_name || "Pengguna",
        start: booking.start_time.slice(0, 5),
        finish: booking.end_time.slice(0, 5),
      }
    }

    return {
      booked: false,
      end: slotEnd,
    }
  }

  function handleSlotClick(start: string, end: string, booked: boolean) {
    if (booked || !end) return

    let updatedSlots = [...selectedSlots]

    if (updatedSlots.includes(start)) {
      updatedSlots = updatedSlots.filter((s) => s !== start)
    } else {
      updatedSlots.push(start)
    }

    updatedSlots.sort()

    // semak slot berturutan
    for (let i = 0; i < updatedSlots.length - 1; i++) {
      const currentIndex = timeSlots.indexOf(updatedSlots[i])
      const nextIndex = timeSlots.indexOf(updatedSlots[i + 1])

      if (nextIndex !== currentIndex + 1) {
        alert("Slot yang dipilih mesti berturutan.")
        return
      }
    }

    setSelectedSlots(updatedSlots)

    if (updatedSlots.length > 0) {
      const firstSlot = updatedSlots[0]
      const lastSlot = updatedSlots[updatedSlots.length - 1]

      const lastIndex = timeSlots.indexOf(lastSlot)

      setStartTime(firstSlot)
      setEndTime(timeSlots[lastIndex + 1])
    } else {
      setStartTime("")
      setEndTime("")
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  if (!profile) {
    return <div style={{ padding: 24 }}>Profil tidak dijumpai.</div>
  }

  if (isPending) {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0 }}>Akaun Menunggu Kelulusan</h1>
          <p>
            Akaun anda telah berjaya didaftarkan tetapi masih menunggu kelulusan
            admin sekolah.
          </p>
          <p>
            Anda akan boleh menggunakan sistem selepas akaun ini diluluskan.
          </p>
          <button onClick={handleLogout} style={primaryButtonStyle}>
            Log Keluar
          </button>
        </div>
      </div>
    )
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

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Notifikasi</h2>

        {notifications.length === 0 ? (
          <p>Belum ada notifikasi.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: notification.is_read ? "#f8fafc" : "#eff6ff",
                  border: "1px solid #dbeafe",
                }}
              >
                <strong>{notification.title}</strong>
                <p style={{ margin: "6px 0 0 0" }}>{notification.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin ? (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Pengguna Menunggu Kelulusan</h2>

          {pendingUsers.length === 0 ? (
            <p style={{ color: "#64748b" }}>Tiada pengguna menunggu kelulusan.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>
                    {user.full_name || "Tanpa Nama"}
                  </div>
                  <div style={{ fontSize: 14, color: "#475569" }}>
                    Emel: {user.email || "-"}
                  </div>
                  <div style={{ fontSize: 14, color: "#475569" }}>
                    Peranan: {user.role || "-"}
                  </div>
                  <div style={{ fontSize: 14, color: "#b45309", fontWeight: 600 }}>
                    Status: Menunggu Kelulusan
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => approveUser(user.id)}
                      style={{
                        ...primaryButtonStyle,
                        background: "#15803d",
                      }}
                    >
                      Luluskan Pengguna
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {isAdmin ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <p style={{ margin: 0, color: "#666" }}>Jumlah Bilik Aktif</p>
            <h2 style={{ margin: "8px 0 0 0" }}>{stats.totalRooms}</h2>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <p style={{ margin: 0, color: "#666" }}>Tempahan Akan Datang</p>
            <h2 style={{ margin: "8px 0 0 0" }}>{stats.upcomingBookings}</h2>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <p style={{ margin: 0, color: "#666" }}>Bilik Paling Digunakan</p>
            <h2 style={{ margin: "8px 0 0 0", fontSize: 20 }}>
              {stats.topRoom}
            </h2>
          </div>
        </div>
      ) : null}

      {isAdmin ? (
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
      ) : null}

      {isAdmin ? (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Senarai Bilik</h2>
          {rooms.length === 0 ? (
            <p>Belum ada bilik.</p>
          ) : (
            <ul>
              {rooms.map((room) => (
                <li key={room.id}>
                  {room.room_name}
                  <button
                    onClick={() => toggleRoom(room.id, Boolean(room.is_active))}
                    style={{
                      marginLeft: 10,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: room.is_active ? "#f59e0b" : "#10b981",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {room.is_active ? "Nyahaktifkan" : "Aktifkan"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {isApproved && (isAdmin || isGuru) ? (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            {isAdmin ? "Senarai Semua Tempahan" : "Tempahan Saya"}
          </h2>

          {bookings.length === 0 ? (
            <p style={{ color: "#64748b" }}>Belum ada tempahan.</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {bookings.map((booking: any) => {
                const statusLabel =
                  booking.status === "approved"
                    ? "Diluluskan"
                    : booking.status === "cancelled"
                    ? "Dibatalkan"
                    : "Menunggu Kelulusan"

                const statusColor =
                  booking.status === "approved"
                    ? "#15803d"
                    : booking.status === "cancelled"
                    ? "#b91c1c"
                    : "#b45309"

                const badgeBg =
                  booking.status === "approved"
                    ? "#dcfce7"
                    : booking.status === "cancelled"
                    ? "#fee2e2"
                    : "#fef3c7"

                return (
                  <div
                    key={booking.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: 16,
                      background: "#ffffff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#0f172a",
                            marginBottom: 4,
                          }}
                        >
                          {booking.rooms?.room_name || "Bilik tidak diketahui"}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          Guru: {booking.teacher_name || "Pengguna"}
                        </div>
                      </div>

                      <span
                        style={{
                          background: badgeBg,
                          color: statusColor,
                          fontWeight: 700,
                          fontSize: 12,
                          padding: "6px 10px",
                          borderRadius: 999,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 10,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                          Tarikh
                        </div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {booking.booking_date}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 10,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                          Masa
                        </div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {String(booking.start_time).slice(0, 5)} -{" "}
                          {String(booking.end_time).slice(0, 5)}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 10,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                          Tujuan
                        </div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {booking.purpose || "-"}
                        </div>
                      </div>
                    </div>

                    {booking.status === "cancelled" && booking.cancel_reason ? (
                      <div
                        style={{
                          marginBottom: 12,
                          padding: 10,
                          borderRadius: 10,
                          background: "#fff7ed",
                          color: "#9a3412",
                          fontSize: 13,
                        }}
                      >
                        Sebab batal: {booking.cancel_reason}
                      </div>
                    ) : null}

                    {isAdmin && booking.status === "pending" ? (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          onClick={() => approveBooking(booking)}
                          type="button"
                          style={{
                            ...primaryButtonStyle,
                            background: "#15803d",
                          }}
                        >
                          Luluskan
                        </button>

                        <button
                          onClick={() => cancelBooking(booking)}
                          type="button"
                          style={{
                            ...primaryButtonStyle,
                            background: "#b91c1c",
                          }}
                        >
                          Batalkan
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {isApproved && (isAdmin || isGuru) ? (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Tempah Bilik</h2>

          <form onSubmit={handleBooking}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            required
            style={fieldStyle}
          >
            <option value="">Pilih Kategori Bilik</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            disabled={!selectedCategory}
            style={fieldStyle}
          >
            <option value="">
              {selectedCategory ? "Pilih Bilik" : "Pilih kategori dahulu"}
            </option>
            {filteredRooms.map((room) => (
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

          {roomBookings.length > 0 && (
            <div
              style={{
                marginTop: 10,
                background: "#f1f5f9",
                padding: 10,
                borderRadius: 8,
              }}
            >
              <strong>Tempahan pada tarikh ini:</strong>

              {roomBookings.map((b, i) => (
                <div key={i}>
                  {b.start_time} - {b.end_time}
                  {" "} | {b.profiles?.full_name || "Pengguna"}
                </div>
              ))}
            </div>
          )}

          {roomId && bookingDate && (
            <div
              style={{
                marginTop: 16,
                background: "#ffffff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Jadual Slot Bilik</h3>

              <div style={{ display: "grid", gap: 10 }}>
                {timeSlots.slice(0, -1).map((slot) => {
                  const status = isSlotBooked(slot)

                  return (
                    <div
                      key={slot}
                      onClick={() => handleSlotClick(slot, status?.end || "", Boolean(status?.booked))}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: status?.booked
                          ? "#fee2e2"
                          : selectedSlots.includes(slot)
                          ? "#dbeafe"
                          : "#dcfce7",
                        border: status?.booked
                          ? "1px solid #fecaca"
                          : selectedSlots.includes(slot)
                          ? "1px solid #60a5fa"
                          : "1px solid #bbf7d0",
                        cursor: status?.booked ? "not-allowed" : "pointer",
                        opacity: status?.booked ? 0.7 : 1,
                      }}
                    >
                      <div>
                        <strong>
                          {slot} - {status?.end}
                        </strong>
                      </div>

                      <div>
                        {status?.booked
                          ? `Ditempah oleh ${status.name}`
                          : "Tersedia (klik untuk tempah)"}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
      ) : null}
    </div>
  )
}