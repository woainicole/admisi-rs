import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [proses, setProses] = useState(false)

  // Sudah login -> tidak perlu melihat halaman login.
  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function kirim(e) {
    e.preventDefault()
    setProses(true)
    try {
      await signIn(email, password)
      toast.success('Berhasil masuk')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={kirim} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-600 p-2 text-white">
            <Activity size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-800">AdmisiRS</h1>
            <p className="text-xs text-slate-500">Sistem Admisi &amp; Rawat Inap</p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
            placeholder="nama@admisi.id"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
            placeholder="••••••"
          />
        </label>

        <button
          type="submit"
          disabled={proses}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {proses ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
