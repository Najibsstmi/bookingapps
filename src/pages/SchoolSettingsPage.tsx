import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import AppHeader from "../components/AppHeader"
import { supabase } from "../lib/supabase"

type Profile = {
  id: string
  full_name: string | null
  email: string
  role: "guru" | "admin" | "pengetua" | "penolong_kanan"
  approval_status: string
  school_id: string | null
}

type School = {
  id: string
  school_name: string
  school_code: string | null
  logo_url: string | null
}

export default function SchoolSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
      console.log("PROFILE DATA:", profileData)

      if (profileData.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("id, school_name, school_code, logo_url")
          .eq("id", profileData.school_id)
          .single()

        if (!schoolError && schoolData) {
          setSchool(schoolData as School)
          setSchoolName(schoolData.school_name || "")
          setSchoolLogoUrl(schoolData.logo_url || "")
        }
      }

      setLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setMessage("")

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Sila pilih fail gambar sahaja.")
      return
    }

    setSelectedFile(file)
    setMessage("Logo baharu dipilih. Tekan Simpan Logo untuk sahkan.")
  }

  async function handleSaveLogo() {
    try {
      if (!selectedFile || !profile?.school_id || !school) return

      setUploading(true)
      setMessage("")

      const fileExt = selectedFile.name.split(".").pop() || "png"
      const filePath = `${profile.school_id}/school-logo-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("school-logos")
        .upload(filePath, selectedFile, {
          upsert: true,
        })

      if (uploadError) {
        alert("Gagal upload logo: " + uploadError.message)
        return
      }

      const { data } = supabase.storage
        .from("school-logos")
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl

      const { data: updatedSchool, error: updateError } = await supabase
        .from("schools")
        .update({ logo_url: publicUrl })
        .eq("id", profile.school_id)
        .select("id, school_name, school_code, logo_url")
        .single()

      console.log("profile.school_id:", profile.school_id)
      console.log("publicUrl:", publicUrl)
      console.log("updatedSchool:", updatedSchool)
      console.log("updateError:", updateError)

      if (updateError) {
        alert("Gagal simpan URL logo: " + updateError.message)
        return
      }

      setSchool(updatedSchool as School)
      setSchoolName(updatedSchool.school_name || "")
      setSchoolLogoUrl(updatedSchool.logo_url || "")
      setSelectedFile(null)
      setPreviewUrl(null)
      setMessage("Logo sekolah berjaya disimpan.")
    } finally {
      setUploading(false)
    }
  }

  function handleCancelSelection() {
    setSelectedFile(null)
    setPreviewUrl(null)
    setMessage("")
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

  const primaryButtonStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 16px",
    borderRadius: 10,
    background: "#16325B",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    border: "none",
  }

  const secondaryButtonStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 16px",
    borderRadius: 10,
    background: "#e2e8f0",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
    border: "none",
  }

  const displayedLogo = previewUrl || school?.logo_url || null

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 24 }}>
      <AppHeader
        schoolName={school?.school_name || schoolName}
        schoolLogoUrl={school?.logo_url || schoolLogoUrl}
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
        <h1 style={{ marginTop: 0 }}>Tetapan Sekolah</h1>
        <p>Urus logo sekolah untuk paparan dashboard dan identiti sekolah.</p>

        {school ? (
          <>
            <p>
              <strong>Nama Sekolah:</strong> {school.school_name}
            </p>
            <p>
              <strong>Kod Sekolah:</strong> {school.school_code || "-"}
            </p>

            <div style={{ margin: "20px 0" }}>
              {displayedLogo ? (
                <img
                  src={displayedLogo}
                  alt="Logo sekolah"
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "contain",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    padding: 8,
                    background: "#fff",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 12,
                    border: "1px dashed #cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  Tiada logo
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={primaryButtonStyle}>
                Pilih Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  disabled={uploading}
                />
              </label>

              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={!selectedFile || uploading}
                style={{
                  ...primaryButtonStyle,
                  opacity: !selectedFile || uploading ? 0.6 : 1,
                }}
              >
                {uploading ? "Sedang menyimpan..." : "Simpan Logo"}
              </button>

              {selectedFile ? (
                <button
                  type="button"
                  onClick={handleCancelSelection}
                  disabled={uploading}
                  style={secondaryButtonStyle}
                >
                  Batal
                </button>
              ) : null}
            </div>

            {selectedFile ? (
              <p style={{ marginTop: 16, color: "#0f766e" }}>
                Logo baharu dipilih. Tekan Simpan Logo untuk sahkan.
              </p>
            ) : null}

            {message ? (
              <p style={{ marginTop: 16, color: "#15803d" }}>{message}</p>
            ) : null}
          </>
        ) : (
          <p>Maklumat sekolah tidak dijumpai.</p>
        )}
      </div>
    </div>
  )
}
