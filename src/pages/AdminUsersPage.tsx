import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import AppHeader from "../components/AppHeader"
import { supabase } from "../lib/supabase"

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
  approval_status: string
}

type MyProfile = {
  school_id: string
  role: string
  approval_status: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState("")
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("")
  const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = "/login"
}

  const loadUsers = async () => {
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

    const { data: myProfile, error: myProfileError } = await supabase
      .from("profiles")
      .select("school_id, role, approval_status")
      .eq("id", user.id)
      .single<MyProfile>()

    if (myProfileError || !myProfile) {
      setMessage("Profil admin tidak dijumpai.")
      setLoading(false)
      return
    }

    setProfile(myProfile)

    if (myProfile.school_id) {
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("school_name, logo_url")
        .eq("id", myProfile.school_id)
        .single()

      if (!schoolError && schoolData) {
        setSchoolName(schoolData.school_name || "")
        setSchoolLogoUrl(schoolData.logo_url || "")
      }
    }

    const allowedRoles = ["admin", "pengetua"]

    if (
      myProfile.approval_status !== "approved" ||
      !allowedRoles.includes(myProfile.role)
    ) {
      setMessage("Anda tidak mempunyai akses ke halaman ini.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, approval_status")
      .eq("school_id", myProfile.school_id)
      .order("created_at", { ascending: false })

    if (error) {
      setMessage("Gagal memuatkan senarai pengguna.")
    } else {
      setUsers(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", userId)

    if (error) {
      alert("Gagal meluluskan pengguna.")
    } else {
      loadUsers()
    }
  }

  const handleReject = async (userId: string) => {
    const confirmed = window.confirm("Adakah anda pasti untuk menolak pengguna ini?")
    if (!confirmed) return

    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("id", userId)

    if (error) {
      alert("Gagal menolak pengguna.")
    } else {
      loadUsers()
    }
  }

  const updateRole = async (userId: string, newRole: string) => {
    try {
      setSavingUserId(userId)

      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId)

      if (error) {
        alert("Gagal mengemaskini role.")
        return
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      )

      alert("Role berjaya dikemaskini.")
    } finally {
      setSavingUserId(null)
    }
  }

  const pageWrapperStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    padding: "16px",
    boxSizing: "border-box",
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    marginBottom: 16,
    width: "100%",
    boxSizing: "border-box",
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  return (
    <div style={pageWrapperStyle}>
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
        <h1 style={{ marginTop: 0 }}>Senarai Pengguna Sekolah</h1>
        <p>Admin boleh semak pengguna yang masih menunggu kelulusan.</p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 10,
            padding: "10px 16px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Log Keluar
        </button>
      </div>

      <div style={cardStyle}>
        {message && <p style={{ marginTop: 0, marginBottom: 0 }}>{message}</p>}

        {!message && (
          <>
          <p style={{ marginTop: 10, marginBottom: 8, fontSize: "12px", color: "#6b7280" }}>
            Slide ke kanan untuk lihat semua maklumat →
          </p>

          <div
            style={{
              overflowX: "auto",
              width: "100%",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table
              style={{
                minWidth: "600px",
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 8,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Nama</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Tukar Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.full_name}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{item.email}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{item.role}</td>
                    <td style={tdStyle}>
                      <select
                        value={item.role}
                        onChange={(e) => updateRole(item.id, e.target.value)}
                        disabled={savingUserId === item.id}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc", minHeight: "44px" }}
                      >
                        <option value="guru">Guru</option>
                        <option value="admin">Admin</option>
                        <option value="pengetua">Pengetua</option>
                        <option value="penolong_kanan">Penolong Kanan</option>
                      </select>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{item.approval_status}</td>
                    <td style={tdStyle}>
                      {item.approval_status === "pending" ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleApprove(item.id)}>Approve</button>
                          <button onClick={() => handleReject(item.id)}>Reject</button>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: 12,
  textAlign: "left",
  background: "#f5f5f5",
}

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: 12,
}