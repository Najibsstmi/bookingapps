import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

type School = {
  id: string
  school_name: string
  school_code: string
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [schoolId, setSchoolId] = useState("")
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, school_name, school_code")
        .order("school_name", { ascending: true })

      if (error) {
        console.error("Ralat ambil schools:", error)
      } else {
        setSchools(data || [])
      }
    }

    loadSchools()
  }, [])

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id

    if (!userId) {
      setMessage("Pendaftaran berjaya, tetapi ID pengguna tidak ditemui.")
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        school_id: schoolId,
        role: "guru",
        approval_status: "pending",
      })
      .eq("id", userId)

    if (profileError) {
      setMessage("Akaun berjaya didaftar, tetapi profil gagal dikemaskini.")
    } else {
      setMessage("Pendaftaran berjaya. Sila tunggu kelulusan pihak sekolah.")
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 460, margin: "60px auto", padding: 24 }}>
      <h1>Daftar Akaun Guru</h1>
      <p>Sistem Tempahan Bilik Khas Sekolah</p>

      <form onSubmit={handleRegister} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Nama penuh"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />

        <input
          type="password"
          placeholder="Kata laluan"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        />

        <select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        >
          <option value="">-- Pilih sekolah --</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.school_name} ({school.school_code})
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, fontSize: 16 }}
        >
          {loading ? "Sedang mendaftar..." : "Daftar"}
        </button>
      </form>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}

      <p style={{ marginTop: 20 }}>
        Sudah ada akaun? <Link to="/login">Log masuk di sini</Link>
      </p>
    </div>
  )
}