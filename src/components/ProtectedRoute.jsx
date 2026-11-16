import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { menuUntuk } from '../lib/roles.js'
import Spinner from './ui/Spinner.jsx'

export default function ProtectedRoute() {
  const { user, profile, role, loading } = useAuth()
  const { pathname } = useLocation()

  // Tunggu sesi selesai dicek supaya tidak "berkedip" ke halaman login.
  if (loading) return <Spinner penuh />
  if (!user) return <Navigate to="/login" replace />

  // Route di luar menu role ini tidak boleh dibuka lewat URL.
  if (profile && !menuUntuk(role).some((m) => pathname.startsWith(m.to))) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
