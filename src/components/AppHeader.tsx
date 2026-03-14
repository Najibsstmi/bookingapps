import { Link } from "react-router-dom"

type AppHeaderProps = {
  schoolName?: string
  schoolLogoUrl?: string
  role?: string
}

export default function AppHeader({
  schoolName,
  schoolLogoUrl,
  role,
}: AppHeaderProps) {
  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "14px 20px",
        marginBottom: 24,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          {schoolLogoUrl ? (
            <img
              src={schoolLogoUrl}
              alt="Logo sekolah"
              style={{
                width: 48,
                height: 48,
                objectFit: "contain",
                borderRadius: 10,
                background: "#fff",
                padding: 4,
                border: "1px solid #e2e8f0",
              }}
            />
          ) : null}

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#16325B" }}>
              Sistem Tempahan Bilik
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#475569",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 260,
              }}
            >
              {schoolName || "Sekolah Anda"}
            </div>
          </div>
        </div>

        <nav
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link
            to="/dashboard"
            style={{ textDecoration: "none", color: "#16325B", fontWeight: 600 }}
          >
            Dashboard
          </Link>

          {(role === "admin" || role === "pengetua") && (
            <>
              <Link
                to="/admin/users"
                style={{ textDecoration: "none", color: "#16325B", fontWeight: 600 }}
              >
                Pengguna
              </Link>

              <Link
                to="/admin/rooms"
                style={{ textDecoration: "none", color: "#16325B", fontWeight: 600 }}
              >
                Bilik
              </Link>

              <Link
                to="/school/settings"
                style={{ textDecoration: "none", color: "#16325B", fontWeight: 600 }}
              >
                Tetapan Sekolah
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
