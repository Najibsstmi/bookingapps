import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function RegisterPage() {
  const [registerMode] = useState<"guru" | "admin">("guru")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [schoolType, setSchoolType] = useState("")
  const [stateValue, setStateValue] = useState("")
  const [district, setDistrict] = useState("")
  const [selectedSchoolId, setSelectedSchoolId] = useState("")

  const [schoolTypes, setSchoolTypes] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [schools, setSchools] = useState<
    {
      id: number
      school_code: string
      school_name: string
      school_type: string
      school_level: string
      state: string
      district: string
    }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, school_code, school_name, school_type, school_level, state, district")
        .order("school_name", { ascending: true })

      if (error) {
        console.error("Ralat ambil schools:", error)
      } else {
        const rows = (data ?? []) as typeof schools
        setSchools(rows)

        const typeOptions = [...new Set(rows.map((s) => s.school_type).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b))
        const stateOptions = [...new Set(rows.map((s) => s.state).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b))

        setSchoolTypes(typeOptions)
        setStates(stateOptions)
      }
    }

    loadSchools()
  }, [])

  useEffect(() => {
    const districtOptions = [...new Set(
      schools
        .filter((s) => !stateValue || s.state === stateValue)
        .map((s) => s.district)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b))

    setDistricts(districtOptions)

    if (district && !districtOptions.includes(district)) {
      setDistrict("")
    }
  }, [schools, stateValue, district])

  const filteredSchools = schools.filter((school) => {
    if (schoolType && school.school_type !== schoolType) return false
    if (stateValue && school.state !== stateValue) return false
    if (district && school.district !== district) return false
    return true
  })

  useEffect(() => {
    if (
      selectedSchoolId &&
      !filteredSchools.some((school) => String(school.id) === selectedSchoolId)
    ) {
      setSelectedSchoolId("")
    }
  }, [selectedSchoolId, filteredSchools])

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    if (!selectedSchoolId) {
      setMessage("Sila pilih sekolah.")
      setLoading(false)
      return
    }

    const selectedSchool = schools.find(
      (school) => String(school.id) === selectedSchoolId
    )

    if (!selectedSchool) {
      setMessage("Sekolah tidak sah. Sila pilih sekolah daripada senarai.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          school_id: registerMode === "guru" ? selectedSchoolId : "",
          role: registerMode === "admin" ? "admin" : "guru",
        },
      },
    })

    if (error) {
      setMessage(error.message)
    } else if (!data.user) {
      setMessage("Pendaftaran berjaya. Sila semak emel atau log masuk.")
    } else {
      setMessage("Pendaftaran berjaya. Sila semak emel atau log masuk.")
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 460, margin: "60px auto", padding: 24 }}>
      <h1>Daftar Akaun</h1>
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
          value={schoolType}
          onChange={(e) => setSchoolType(e.target.value)}
          style={{ padding: 12, fontSize: 16 }}
        >
          <option value="">-- Jenis sekolah --</option>
          {schoolTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={stateValue}
          onChange={(e) => setStateValue(e.target.value)}
          style={{ padding: 12, fontSize: 16 }}
        >
          <option value="">-- Negeri --</option>
          {states.map((stateItem) => (
            <option key={stateItem} value={stateItem}>
              {stateItem}
            </option>
          ))}
        </select>

        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          disabled={!stateValue}
          style={{ padding: 12, fontSize: 16 }}
        >
          <option value="">-- Daerah --</option>
          {districts.map((districtItem) => (
            <option key={districtItem} value={districtItem}>
              {districtItem}
            </option>
          ))}
        </select>

        <select
          value={selectedSchoolId}
          onChange={(e) => setSelectedSchoolId(e.target.value)}
          required
          style={{ padding: 12, fontSize: 16 }}
        >
          <option value="">-- Pilih sekolah --</option>
          {filteredSchools.map((school) => (
            <option key={String(school.id)} value={String(school.id)}>
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