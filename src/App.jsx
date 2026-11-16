import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Pasien from './pages/Pasien.jsx'
import Kamar from './pages/Kamar.jsx'
import Operasi from './pages/Operasi.jsx'
import Integrasi from './pages/Integrasi.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppLayout from './components/layout/AppLayout.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pasien" element={<Pasien />} />
          <Route path="/kamar" element={<Kamar />} />
          <Route path="/operasi" element={<Operasi />} />
          <Route path="/integrasi" element={<Integrasi />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
