import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import DashboardPage from "./pages/DashboardPage"
import AdminUsersPage from "./pages/AdminUsersPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import UpdatePasswordPage from "./pages/UpdatePasswordPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/update-password" element={<UpdatePasswordPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App