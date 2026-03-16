import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

type MasterSchool = {
  id: number
  school_code: string
  school_name: string
  school_type: string | null
  school_level: string | null
  state: string
  district: string
}

type ActiveSchool = {
  id: string
  school_code: string | null
  school_name: string
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [schoolType, setSchoolType] = useState("")
  const [stateValue, setStateValue] = useState("")
  const [district, setDistrict] = useState("")
  const [selectedSchoolCode, setSelectedSchoolCode] = useState("")

  const [masterSchools, setMasterSchools] = useState<MasterSchool[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const loadSchoolsMaster = async () => {
      setLoadingSchools(true)

      const { data, error } = await supabase
        .from("schools_master")
        .select(
          "id, school_code, school_name, school_type, school_level, state, district"
        )
        .range(0, 20000)
        .order("school_name", { ascending: true })

      if (error) {
        console.error("Ralat ambil schools_master:", error)
        setMessage("Gagal memuatkan senarai sekolah.")
      } else {
        setMasterSchools((data ?? []) as MasterSchool[])
      }

      setLoadingSchools(false)
    }

    loadSchoolsMaster()
  }, [])

  const schoolTypes = useMemo(() => {
    return [...new Set(masterSchools.map((item) => item.school_type || "").filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    )
  }, [masterSchools])

  const states = useMemo(() => {
    if (!schoolType) return []
    return [
      ...new Set(
        masterSchools
          .filter((item) => (item.school_type || "") === schoolType)
          .map((item) => item.state)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b))
  }, [masterSchools, schoolType])

  const districts = useMemo(() => {
    if (!schoolType || !stateValue) return []
    return [
      ...new Set(
        masterSchools
          .filter(
            (item) =>
              (item.school_type || "") === schoolType &&
              item.state === stateValue
          )
          .map((item) => item.district)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b))
  }, [masterSchools, schoolType, stateValue])

  const filteredSchools = useMemo(() => {
    if (!schoolType || !stateValue || !district) return []
    return masterSchools
      .filter(
        (item) =>
          (item.school_type || "") === schoolType &&
          item.state === stateValue &&
          item.district === district
      )
      .sort((a, b) => a.school_name.localeCompare(b.school_name))
  }, [masterSchools, schoolType, stateValue, district])

  const selectedSchool = useMemo(() => {
    return (
      filteredSchools.find((item) => item.school_code === selectedSchoolCode) ||
      null
    )
  }, [filteredSchools, selectedSchoolCode])

  function handleSchoolTypeChange(value: string) {
    setSchoolType(value)
    setStateValue("")
    setDistrict("")
    setSelectedSchoolCode("")
  }

  function handleStateChange(value: string) {
    setStateValue(value)
    setDistrict("")
    setSelectedSchoolCode("")
  }

  function handleDistrictChange(value: string) {
    setDistrict(value)
    setSelectedSchoolCode("")
  }

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      if (!selectedSchool) {
        setMessage("Sila pilih sekolah daripada senarai.")
        return
      }

      let activeSchoolId = ""

      const { data: existingSchool, error: existingSchoolError } = await supabase
        .from("schools")
        .select("id, school_code, school_name")
        .eq("school_code", selectedSchool.school_code)
        .maybeSingle()

      if (existingSchoolError) {
        setMessage("Gagal menyemak sekolah sedia ada.")
        return
      }

      if (existingSchool) {
        activeSchoolId = (existingSchool as ActiveSchool).id
      } else {
        const { data: insertedSchool, error: insertSchoolError } = await supabase
          .from("schools")
          .insert({
            school_name: selectedSchool.school_name,
            school_code: selectedSchool.school_code,
            state: selectedSchool.state,
          })
          .select("id")
          .single()

        if (insertSchoolError || !insertedSchool) {
          console.error(insertSchoolError)
          setMessage("Gagal mencipta rekod sekolah: " + insertSchoolError?.message)
          return
        }

        activeSchoolId = insertedSchool.id as string
      }

      const { count: usersInSchoolCount, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", activeSchoolId)

      if (countError) {
        setMessage("Gagal menyemak bilangan pengguna sekolah.")
        return
      }

      const isFirstUser = (usersInSchoolCount ?? 0) === 0
      const assignedRole = isFirstUser ? "admin" : "guru"
      const approvalStatus = isFirstUser ? "approved" : "pending"

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            school_id: activeSchoolId,
            role: assignedRole,
            approval_status: approvalStatus,
            school_code: selectedSchool.school_code,
            school_name: selectedSchool.school_name,
            school_type: selectedSchool.school_type,
            school_level: selectedSchool.school_level,
            state: selectedSchool.state,
            district: selectedSchool.district,
          },
        },
      })

      if (error) {
        setMessage(error.message)
        return
      }

      if (isFirstUser) {
        setMessage("Pendaftaran berjaya. Anda ialah admin pertama bagi sekolah ini.")
      } else {
        setMessage("Pendaftaran berjaya. Akaun anda sedang menunggu kelulusan admin sekolah.")
      }

      setFullName("")
      setEmail("")
      setPassword("")
      setSchoolType("")
      setStateValue("")
      setDistrict("")
      setSelectedSchoolCode("")
    } finally {
      setLoading(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    maxWidth: 520,
    margin: "24px auto",
    padding: 16,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 12,
    fontSize: 16,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    marginTop: 6,
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 14,
    fontWeight: 600,
    color: "#0f172a",
  }

  return (
    <div style={cardStyle}>
      <img
        src="/logoutama.png"
        alt="Logo EduSlot"
        style={{
          width: 120,
          height: 120,
          objectFit: "contain",
          display: "block",
          margin: "0 auto 12px",
        }}
      />
      <h1 style={{ marginTop: 0 }}>Daftar Akaun</h1>
      <p style={{ color: "#475569" }}>Sistem Tempahan Bilik Khas Sekolah</p>

      <form
        onSubmit={handleRegister}
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        <label style={labelStyle}>
          Nama penuh
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Kata laluan
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Jenis sekolah
          <select
            value={schoolType}
            onChange={(e) => handleSchoolTypeChange(e.target.value)}
            required
            style={inputStyle}
            disabled={loadingSchools}
          >
            <option value="">Pilih jenis sekolah</option>
            {schoolTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Negeri
          <select
            value={stateValue}
            onChange={(e) => handleStateChange(e.target.value)}
            required
            style={inputStyle}
            disabled={!schoolType}
          >
            <option value="">Pilih negeri</option>
            {states.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          PPD
          <select
            value={district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            required
            style={inputStyle}
            disabled={!schoolType || !stateValue}
          >
            <option value="">Pilih PPD</option>
            {districts.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Nama sekolah
          <select
            value={selectedSchoolCode}
            onChange={(e) => setSelectedSchoolCode(e.target.value)}
            required
            style={inputStyle}
            disabled={!schoolType || !stateValue || !district}
          >
            <option value="">Pilih nama sekolah</option>
            {filteredSchools.map((school) => (
              <option key={school.school_code} value={school.school_code}>
                {school.school_name} ({school.school_code})
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading || loadingSchools}
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "12px 16px",
            background: "#16325B",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          {loading ? "Sedang mendaftar..." : "Daftar"}
        </button>

        {message ? (
          <p style={{ marginTop: 14, color: "#0f172a" }}>{message}</p>
        ) : null}
      </form>

      <p style={{ marginTop: 20 }}>
        Sudah ada akaun?{" "}
        <Link to="/login" style={{ color: "#16325B", fontWeight: 700 }}>
          Log masuk di sini
        </Link>
      </p>
    </div>
  )
}
