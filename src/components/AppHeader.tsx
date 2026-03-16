import { Link } from "react-router-dom"

type AppHeaderProps = {
  schoolName?: string
  schoolLogoUrl?: string
  role?: string
}

export default function AppHeader({
  schoolName,
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
          <img
            src="/app-logo.svg"
            alt="Logo aplikasi"
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
            gap: "8px 12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link
            to="/dashboard"
            style={{
              textDecoration: "none",
              color: "#16325B",
              fontWeight: 600,
              fontSize: "13px",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="8" height="8" rx="1.5" />
              <rect x="13" y="3" width="8" height="5" rx="1.5" />
              <rect x="13" y="10" width="8" height="11" rx="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" />
            </svg>
            Dashboard
          </Link>

          {(role === "admin" || role === "pengetua") && (
            <>
              <Link
                to="/admin/users"
                style={{
                  textDecoration: "none",
                  color: "#16325B",
                  fontWeight: 600,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
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
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Pengguna
              </Link>

              <Link
                to="/admin/rooms"
                style={{
                  textDecoration: "none",
                  color: "#16325B",
                  fontWeight: 600,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 3h6" />
                  <path d="M9 3a2 2 0 0 0-2 2v1h10V5a2 2 0 0 0-2-2" />
                  <rect x="5" y="6" width="14" height="15" rx="2" />
                  <path d="M9 11h6" />
                  <path d="M9 15h6" />
                </svg>
                Bilik
              </Link>

              <Link
                to="/school/settings"
                style={{
                  textDecoration: "none",
                  color: "#16325B",
                  fontWeight: 600,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
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
                Tetapan Sekolah
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
