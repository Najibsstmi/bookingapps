import { useEffect, useState } from "react"
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
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
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

    const allowedRoles = ["admin", "pengetua", "penolong_kanan", "penyelaras_bilik_khas"]

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

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 24 }}>
      <h1>Senarai Pengguna Sekolah</h1>
      <p>Admin boleh semak pengguna yang masih menunggu kelulusan.</p>
      <button
  onClick={handleLogout}
  style={{
    marginTop: 10,
    marginBottom: 20,
    padding: "10px 16px",
    fontSize: 16,
    cursor: "pointer"
  }}
>
  Log Keluar
</button>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}

      {!message && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 20,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Nama</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.full_name}</td>
                <td style={tdStyle}>{item.email}</td>
                <td style={tdStyle}>{item.role}</td>
                <td style={tdStyle}>{item.approval_status}</td>
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
      )}
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