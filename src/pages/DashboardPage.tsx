import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import AppHeader from "../components/AppHeader"
import { supabase } from "../lib/supabase"
import { seedDefaultRooms } from "../lib/roomService"

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

type BookingForSlot = {
  start_time: string
  end_time: string
  status?: string
  profiles?: {
    full_name?: string
  } | null
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [roomBookings, setRoomBookings] = useState<BookingForSlot[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [stats, setStats] = useState({
    totalRooms: 0,
    upcomingBookings: 0,
    topRoom: "",
  })
  const [notifications, setNotifications] = useState<any[]>([])
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState("")
  const [roomId, setRoomId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [bookingDate, setBookingDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [purpose, setPurpose] = useState("")
  const [message, setMessage] = useState("")
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [showApprovedBookings, setShowApprovedBookings] = useState(false)
  const [showRejectedBookings, setShowRejectedBookings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [openSessions, setOpenSessions] = useState({
    pagi: true,
    petang: false,
    malam: false,
  })

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

      if (!profileError && profileData) {
        setProfile(profileData)

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
        }
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
    cancelled_by,
    cancelled_by_name,
    cancelled_at,
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
      return
    }

    const bookingsData = data || []
    const userIds = [
      ...new Set(
        bookingsData
          .flatMap((b: any) => [b.user_id, b.cancelled_by])
          .filter(Boolean)
      ),
    ]

    let profileMap = new Map<string, string>()

    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)

    if (!profilesError && profileRows) {
      profileMap = new Map(profileRows.map((p: any) => [p.id, p.full_name]))
    }

    const mergedBookings = bookingsData.map((booking: any) => ({
      ...booking,
      teacher_name: profileMap.get(booking.user_id) || booking.user_id,
      cancelled_by_name: booking.cancelled_by
        ? booking.cancelled_by_name || profileMap.get(booking.cancelled_by) || null
        : null,
    }))

    setBookings(mergedBookings)
  }

  async function loadRooms(schoolIdValue?: string) {
    if (!schoolIdValue) {
      return
    }

    const { data, error } = await supabase
      .from("rooms")
      .select("id, school_id, room_name, room_category, capacity, is_active")
      .eq("school_id", schoolIdValue)
      .eq("is_active", true)
      .order("room_name", { ascending: true })

    if (error) {
      console.error("Ralat load rooms:", error)
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

    const rows = data || []
    setPendingUsers(rows)

    const roleDefaults: Record<string, string> = {}
    rows.forEach((user: any) => {
      roleDefaults[user.id] = user.role || "guru"
    })
    setSelectedRoles(roleDefaults)
  }

  const loadNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Ralat load notifications:", error)
      return
    }

    setNotifications(data || [])
  }

  const createNotification = async ({
    userId,
    schoolIdValue,
    title,
    message,
  }: {
    userId: string
    schoolIdValue: string
    title: string
    message: string
  }) => {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      school_id: schoolIdValue,
      title,
      message,
      is_read: false,
    })

    if (error) {
      console.error("Ralat create notification:", error)
    }
  }

  const notifySchoolAdmins = async ({
    schoolIdValue,
    title,
    message,
  }: {
    schoolIdValue: string
    title: string
    message: string
  }) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("school_id", schoolIdValue)
      .in("role", ["admin", "pengetua", "penolong_kanan"])
      .eq("approval_status", "approved")

    if (error) {
      console.error("Ralat cari admin sekolah:", error)
      return
    }

    const adminRows = data || []

    if (adminRows.length === 0) return

    const notificationsToInsert = adminRows.map((admin: any) => ({
      user_id: admin.id,
      school_id: schoolIdValue,
      title,
      message,
      is_read: false,
    }))

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notificationsToInsert)

    if (insertError) {
      console.error("Ralat notify admins:", insertError)
    }
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
    await createNotification({
      userId: teacherId,
      schoolIdValue: schoolId,
      title: "Tempahan berjaya dihantar",
      message: `Tempahan anda untuk ${roomName} pada ${bookingDate}, ${startTime} - ${endTime} sedang menunggu kelulusan.`,
    })

    await notifySchoolAdmins({
      schoolIdValue: schoolId,
      title: "Tempahan baru diterima",
      message: `${teacherName || "Seorang guru"} telah membuat tempahan untuk ${roomName} pada ${bookingDate}, ${startTime} - ${endTime}.`,
    })
  }

  async function notifyBookingApproved(booking: any) {
    await createNotification({
      userId: booking.user_id,
      schoolIdValue: booking.school_id,
      title: "Tempahan diluluskan",
      message: `Tempahan anda untuk ${booking.rooms?.room_name || "bilik"} pada ${booking.booking_date}, ${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)} telah diluluskan.`,
    })
  }

  async function notifyBookingCancelled(booking: any, reason: string) {
    await createNotification({
      userId: booking.user_id,
      schoolIdValue: booking.school_id,
      title: "Tempahan dibatalkan",
      message: `Tempahan anda untuk ${booking.rooms?.room_name || "bilik"} pada ${booking.booking_date}, ${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)} telah dibatalkan. Sebab: ${reason}`,
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

      await loadNotifications(profile.id)
      await loadRooms(profile.school_id)
      await loadBookings(profile.school_id, profile.id, profile.role)

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

  const SESSION_GROUPS = [
    { key: "pagi", label: "Sesi Pagi", slots: ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00"] },
    { key: "petang", label: "Sesi Petang", slots: ["12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"] },
    { key: "malam", label: "Sesi Malam", slots: ["17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30"] },
  ]

  const allTimeSlots = [
    "07:00","07:30",
    "08:00","08:30",
    "09:00","09:30",
    "10:00","10:30",
    "11:00","11:30",
    "12:00","12:30",
    "13:00","13:30",
    "14:00","14:30",
    "15:00","15:30",
    "16:00","16:30",
    "17:00","17:30",
    "18:00","18:30",
    "19:00","19:30",
    "20:00","20:30",
    "21:00","21:30",
    "22:00","22:30",
    "23:00",
  ]

  useEffect(() => {
    setRoomId("")
  }, [selectedCategory])

  async function loadRoomBookings(selectedRoomId?: string, selectedBookingDate?: string) {
    const roomIdToUse = selectedRoomId ?? roomId
    const bookingDateToUse = selectedBookingDate ?? bookingDate

    if (!roomIdToUse || !bookingDateToUse) {
      setRoomBookings([])
      return
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        start_time,
        end_time,
        status,
        booking_date,
        profiles (
          full_name
        )
      `)
      .eq("room_id", roomIdToUse)
      .eq("booking_date", bookingDateToUse)
      .in("status", ["pending", "approved"])
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Ralat load room bookings:", error)
      return
    }

    setRoomBookings((data ?? []) as BookingForSlot[])
  }

  useEffect(() => {
    loadRoomBookings()
  }, [roomId, bookingDate, bookings])

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

    const selectedRole = selectedRoles[userId] || "guru"
    const schoolId = profile?.school_id

    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: "approved",
        role: selectedRole,
      })
      .eq("id", userId)

    if (error) {
      console.error("Gagal meluluskan pengguna:", error)
      alert("Gagal meluluskan pengguna.")
      return
    }

    alert("Pengguna berjaya diluluskan.")

    if (schoolId) {
      await loadPendingUsers(schoolId)
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
      await loadRoomBookings(booking.room_id, booking.booking_date)
    }
    if (currentUser?.id) {
      await loadNotifications(currentUser.id)
    }
  }

  async function cancelBooking(booking: any) {
    const reason = window.prompt("Masukkan sebab pembatalan tempahan:")

    if (reason === null) {
      return
    }

    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      alert("Sebab pembatalan wajib diisi.")
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData?.user

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_by: currentUser?.id || null,
        cancelled_by_name: profile?.full_name || "Pentadbir",
        cancelled_at: new Date().toISOString(),
        cancel_reason: trimmedReason,
      })
      .eq("id", booking.id)

    if (error) {
      alert("Gagal batalkan tempahan: " + error.message)
      console.error("CANCEL ERROR FULL:", JSON.stringify(error, null, 2))
      return
    }

    alert("Tempahan berjaya dibatalkan.")

    await notifyBookingCancelled(booking, trimmedReason)
    if (profile?.school_id) {
      await loadBookings(profile.school_id, profile.id, profile.role)
      await loadRoomBookings(booking.room_id, booking.booking_date)
    }
    if (currentUser?.id) {
      await loadNotifications(currentUser.id)
    }
  }

  async function handleBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage("")

    const currentUser = currentUserId ? { id: currentUserId } : null
    const schoolId = profile?.school_id
    const selectedRoomId = roomId
    const selectedStartTime = startTime
    const selectedEndTime = endTime
    const trimmedPurpose = purpose.trim()

    if (!currentUser || !profile || !schoolId) {
      alert("Maklumat pengguna tidak lengkap.")
      return
    }

    if (!selectedRoomId) {
      alert("Sila pilih bilik terlebih dahulu.")
      return
    }

    if (!bookingDate) {
      alert("Sila pilih tarikh tempahan.")
      return
    }

    if (bookingDate < today) {
      alert("Tarikh tempahan tidak boleh sebelum hari ini.")
      return
    }

    if (!selectedStartTime || !selectedEndTime) {
      alert("Sila pilih masa mula dan masa tamat.")
      return
    }

    if (selectedStartTime >= selectedEndTime) {
      alert("Masa tamat mestilah lebih lewat daripada masa mula.")
      return
    }

    if (!trimmedPurpose) {
      alert("Sila isi tujuan penggunaan bilik.")
      return
    }

    setSubmittingBooking(true)

    try {
      const hasOverlap = roomBookings.some((booking) => {
        const bookingStart = String(booking.start_time).slice(0, 5)
        const bookingEnd = String(booking.end_time).slice(0, 5)
        return (
          booking.status !== "dibatalkan" &&
          booking.status !== "cancelled" &&
          bookingStart < selectedEndTime &&
          bookingEnd > selectedStartTime
        )
      })

      if (hasOverlap) {
        setMessage("Slot masa ini bertindih dengan tempahan sedia ada.")
        return
      }

      const { data: clashes, error: clashError } = await supabase
        .from("bookings")
        .select("id")
        .eq("room_id", selectedRoomId)
        .eq("booking_date", bookingDate)
        .eq("status", "approved")
        .lt("start_time", selectedEndTime)
        .gt("end_time", selectedStartTime)

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
          school_id: schoolId,
          room_id: selectedRoomId,
          user_id: currentUser.id,
          booking_date: bookingDate,
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          purpose: trimmedPurpose,
          status: "pending",
        })

      if (error) {
        alert("Gagal menghantar tempahan: " + error.message)
        console.error("BOOKING ERROR:", error)
        return
      }

      const selectedRoom = rooms.find((room: any) => room.id === selectedRoomId)

      await notifyBookingCreated({
        schoolId,
        bookingDate,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        roomName: selectedRoom?.room_name || "Bilik",
        teacherName: profile.full_name || "Pengguna",
        teacherId: profile.id,
      })

      alert("Tempahan berjaya dihantar dan sedang menunggu kelulusan.")

      setSelectedSlots([])
      setSelectedCategory("")
      setRoomId("")
      setBookingDate("")
      setStartTime("")
      setEndTime("")
      setPurpose("")

      await loadBookings(schoolId, currentUser.id, profile.role)
      await loadNotifications(currentUser.id)
      await loadRoomBookings(selectedRoomId, bookingDate)
    } finally {
      setSubmittingBooking(false)
    }
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

  const today = new Date().toISOString().split("T")[0]

  const pendingBookings = bookings.filter((booking: any) => booking.status === "pending")
  const approvedBookings = bookings.filter((booking: any) => booking.status === "approved")
  const cancelledBookings = bookings.filter((booking: any) => booking.status === "cancelled")

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

  const accordionHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    padding: "10px 0",
    userSelect: "none",
  }

  const accordionCountStyle: React.CSSProperties = {
    fontWeight: 700,
  }

  const accordionIconStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
  }

  function isSlotBooked(slotStart: string) {
    const slotIndex = allTimeSlots.indexOf(slotStart)
    const slotEnd = allTimeSlots[slotIndex + 1]

    if (!slotEnd || !roomId || !bookingDate) return null

    const relevantBookings = bookings.filter((booking: any) => {
      const status = String(booking.status || "").toLowerCase()
      return (
        booking.room_id === roomId &&
        booking.booking_date === bookingDate &&
        ["pending", "approved"].includes(status)
      )
    })

    const overlappingBooking = relevantBookings.find((booking: any) => {
      const bookingStart = String(booking.start_time).slice(0, 5)
      const bookingEnd = String(booking.end_time).slice(0, 5)

      return bookingStart < slotEnd && bookingEnd > slotStart
    })

    if (!overlappingBooking) {
      return {
        booked: false,
        end: slotEnd,
      }
    }

    return {
      booked: true,
      end: slotEnd,
      name: overlappingBooking.teacher_name || "Pengguna",
      start: String(overlappingBooking.start_time).slice(0, 5),
      finish: String(overlappingBooking.end_time).slice(0, 5),
    }
  }

  const renderBookingCard = (booking: any) => {
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
          border: booking.status === "cancelled" ? "1px solid #fecaca" : "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 16,
          background: booking.status === "cancelled" ? "#fef2f2" : "#ffffff",
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

        {booking.status === "cancelled" ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: "#fff7ed",
              color: "#9a3412",
              fontSize: 14,
              display: "grid",
              gap: 6,
            }}
          >
            <div>
              <strong>Sebab batal:</strong> {booking.cancel_reason || "Tiada sebab dinyatakan"}
            </div>

            <div>
              <strong>Dibatalkan oleh:</strong> {booking.cancelled_by_name || "Pihak Pengurusan Sekolah"}
            </div>

            {booking.cancelled_at ? (
              <div>
                <strong>Tarikh/Tindakan:</strong>{" "}
                {new Date(booking.cancelled_at).toLocaleString("ms-MY")}
              </div>
            ) : null}
          </div>
        ) : null}

        {isAdmin && (booking.status === "pending" || booking.status === "approved") ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {booking.status === "pending" ? (
              <button
                onClick={() => approveBooking(booking)}
                type="button"
                style={{ ...primaryButtonStyle, background: "#15803d" }}
              >
                Luluskan
              </button>
            ) : null}

            <button
              onClick={() => cancelBooking(booking)}
              type="button"
              style={{ ...primaryButtonStyle, background: "#b91c1c" }}
            >
              Batalkan
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  function handleSlotClick(start: string, end: string, booked: boolean) {
    if (booked || !end) return

    let updatedSlots = [...selectedSlots]

    if (updatedSlots.includes(start)) {
      updatedSlots = updatedSlots.filter((s) => s !== start)
    } else {
      updatedSlots.push(start)
    }

    updatedSlots.sort(
      (a, b) => allTimeSlots.indexOf(a) - allTimeSlots.indexOf(b)
    )

    for (let i = 0; i < updatedSlots.length - 1; i++) {
      const currentIndex = allTimeSlots.indexOf(updatedSlots[i])
      const nextIndex = allTimeSlots.indexOf(updatedSlots[i + 1])

      if (nextIndex !== currentIndex + 1) {
        alert("Slot yang dipilih mesti berturutan.")
        return
      }
    }

    setSelectedSlots(updatedSlots)

    if (updatedSlots.length > 0) {
      const firstSlot = updatedSlots[0]
      const lastSlot = updatedSlots[updatedSlots.length - 1]
      const lastIndex = allTimeSlots.indexOf(lastSlot)

      setStartTime(firstSlot)
      setEndTime(allTimeSlots[lastIndex + 1] || "")
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
      <AppHeader
        schoolName={schoolName}
        schoolLogoUrl={schoolLogoUrl}
        role={profile?.role}
      />

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {schoolLogoUrl ? (
            <img
              src={schoolLogoUrl}
              alt="Logo sekolah"
              style={{
                width: 72,
                height: 72,
                objectFit: "contain",
                borderRadius: 12,
                background: "#fff",
                padding: 6,
                border: "1px solid #e2e8f0",
              }}
            />
          ) : null}

          <div>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p style={{ margin: "6px 0 0 0", fontWeight: 600 }}>
              {schoolName || "Sekolah Anda"}
            </p>
            <p style={{ margin: "6px 0 0 0" }}>
              Selamat datang, {profile?.full_name || profile?.email}.
            </p>
          </div>
        </div>

        <p>Email: {profile?.email}</p>
        <p>Peranan: {profile?.role}</p>
        <p>Status kelulusan: {profile?.approval_status}</p>

        <button onClick={handleLogout} style={primaryButtonStyle}>
          Log Keluar
        </button>
      </div>

      <section
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          marginTop: 24,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          onClick={() => setShowNotifications((prev) => !prev)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <h2 style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
            Notifikasi {notifications.length > 0 ? `(${notifications.length})` : ""}
          </h2>
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            {showNotifications ? "▲" : "▼"}
          </span>
        </div>

        {showNotifications && (
          <div style={{ marginTop: 16 }}>
            {notifications.length === 0 ? (
              <p>Belum ada notifikasi.</p>
            ) : (
              notifications.map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    marginBottom: 10,
                    background: "#f8fafc",
                  }}
                >
                  {item.message}
                </div>
              ))
            )}
          </div>
        )}
      </section>

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

                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 14, color: "#475569", fontWeight: 600 }}>
                      Pilih peranan
                    </label>

                    <select
                      value={selectedRoles[user.id] || "guru"}
                      onChange={(e) =>
                        setSelectedRoles((prev) => ({
                          ...prev,
                          [user.id]: e.target.value,
                        }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        maxWidth: 260,
                      }}
                    >
                      <option value="guru">Guru</option>
                      <option value="penolong_kanan">Penolong Kanan</option>
                      <option value="pengetua">Pengetua</option>
                      <option value="admin">Admin</option>
                    </select>
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

      {(profile?.role === "admin" || profile?.role === "pengetua") && (
        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            marginTop: 24,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Pengurusan Pengguna</h2>
          <p style={{ marginBottom: 16 }}>
            Lihat semua pengguna sekolah dan tukar peranan mereka.
          </p>

          <Link
            to="/admin/users"
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
            Buka Pengurusan Pengguna
          </Link>
        </section>
      )}

      {(profile?.role === "admin" || profile?.role === "pengetua") && (
        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            marginTop: 24,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Pengurusan Bilik</h2>
          <p style={{ marginBottom: 16 }}>
            Tambah bilik baru dan urus status aktif bilik sekolah.
          </p>

          <Link
            to="/admin/rooms"
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 21h18" />
              <path d="M7 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
              <path d="M10 13h.01" />
            </svg>
            Buka Pengurusan Bilik
          </Link>
        </section>
      )}

      {(profile?.role === "admin" || profile?.role === "pengetua") && (
        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            marginTop: 24,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Tetapan Sekolah</h2>
          <p style={{ marginBottom: 16 }}>
            Upload logo sekolah supaya dashboard nampak seperti milik sekolah anda.
          </p>

          <Link
            to="/school/settings"
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Buka Tetapan Sekolah
          </Link>
        </section>
      )}

      {isApproved && (isAdmin || isGuru) ? (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {isAdmin ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
                  <path d="M12 11h4" />
                  <path d="M12 16h4" />
                  <path d="M8 11h.01" />
                  <path d="M8 16h.01" />
                </svg>
                Senarai Semua Tempahan
              </>
            ) : (
              "Tempahan Saya"
            )}
          </h2>

          {bookings.length === 0 ? (
            <p style={{ color: "#64748b" }}>Belum ada tempahan.</p>
          ) : isAdmin ? (
            <div style={{ display: "grid", gap: 24 }}>
              <div>
                <h3 style={{ marginBottom: 12, color: "#b45309" }}>
                  Menunggu Kelulusan ({pendingBookings.length})
                </h3>
                {pendingBookings.length === 0 ? (
                  <p style={{ color: "#64748b" }}>Tiada tempahan menunggu kelulusan.</p>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {pendingBookings.map(renderBookingCard)}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={accordionHeaderStyle}
                  onClick={() => setShowApprovedBookings((prev) => !prev)}
                >
                  <h3 style={{ color: "#15803d", margin: 0 }}>
                    Diluluskan <span style={accordionCountStyle}>({approvedBookings.length})</span>
                  </h3>
                  <span style={accordionIconStyle}>
                    {showApprovedBookings ? "▲" : "▼"}
                  </span>
                </div>

                {showApprovedBookings ? (
                  approvedBookings.length === 0 ? (
                    <p style={{ color: "#64748b" }}>Tiada tempahan diluluskan.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 14 }}>
                      {approvedBookings.map(renderBookingCard)}
                    </div>
                  )
                ) : null}
              </div>

              <div>
                <div
                  style={accordionHeaderStyle}
                  onClick={() => setShowRejectedBookings((prev) => !prev)}
                >
                  <h3 style={{ color: "#b91c1c", margin: 0 }}>
                    Dibatalkan <span style={accordionCountStyle}>({cancelledBookings.length})</span>
                  </h3>
                  <span style={accordionIconStyle}>
                    {showRejectedBookings ? "▲" : "▼"}
                  </span>
                </div>

                {showRejectedBookings ? (
                  cancelledBookings.length === 0 ? (
                    <p style={{ color: "#64748b" }}>Tiada tempahan dibatalkan.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 14 }}>
                      {cancelledBookings.map(renderBookingCard)}
                    </div>
                  )
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {bookings.map(renderBookingCard)}
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
            min={today}
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
                {(() => { console.log("roomBookings semasa render:", roomBookings); return null })()}
                {SESSION_GROUPS.map((session) => {
                  const sessionSlots = session.slots

                  return (
                    <div key={session.key} style={{ marginBottom: 16 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSessions((prev) => ({
                            ...prev,
                            [session.key]: !prev[session.key as keyof typeof prev],
                          }))
                        }
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          fontWeight: 700,
                          cursor: "pointer",
                          marginBottom: 10,
                        }}
                      >
                        {session.label} ({sessionSlots[0]} - {allTimeSlots[allTimeSlots.indexOf(sessionSlots[sessionSlots.length - 1]) + 1] ?? sessionSlots[sessionSlots.length - 1]}){" "}
                        <span style={{ float: "right" }}>
                          {openSessions[session.key as keyof typeof openSessions] ? "▲" : "▼"}
                        </span>
                      </button>

                      {openSessions[session.key as keyof typeof openSessions] && (
                        <div style={{ display: "grid", gap: 10 }}>
                          {sessionSlots.map((slot) => {
                            const status = isSlotBooked(slot)

                            return (
                              <button
                                key={`${session.key}-${slot}`}
                                type="button"
                                onClick={() =>
                                  handleSlotClick(slot, status?.end || "", Boolean(status?.booked))
                                }
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
                                  opacity: status?.booked ? 0.85 : 1,
                                }}
                              >
                                <span>
                                  {slot} - {status?.end}
                                </span>
                                <span>
                                  {status?.booked ? "Tidak tersedia" : "Tersedia"}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
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
            required
            style={fieldStyle}
          />

          <button type="submit" style={primaryButtonStyle} disabled={submittingBooking}>
            {submittingBooking ? "Menghantar..." : "Tempah Sekarang"}
          </button>

          {message ? (
            <p style={{ marginTop: 10, color: "#b91c1c", fontWeight: 600 }}>{message}</p>
          ) : null}
          </form>
        </div>
      ) : null}
    </div>
  )
}