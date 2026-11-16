import { LogOut, Menu } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE } from '../../lib/roles.js'
import Badge from '../ui/Badge.jsx'

export default function Topbar({ onBukaMenu }) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  async function keluar() {
    try {
      await signOut()
      navigate('/login', { replace: true })
      toast.success('Anda sudah keluar')
    } catch {
      toast.error('Gagal keluar. Coba lagi.')
    }
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <button onClick={onBukaMenu} className="rounded p-1 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Buka menu">
        <Menu size={20} />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">{profile?.nama}</p>
          <Badge warna={role === ROLE.ADMIN ? 'biru' : 'hijau'}>{role}</Badge>
        </div>
        <button
          onClick={keluar}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={15} /> Keluar
        </button>
      </div>
    </header>
  )
}
