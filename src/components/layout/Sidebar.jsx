import { NavLink } from 'react-router-dom'
import { Activity, BedDouble, CalendarClock, LayoutDashboard, Plug, Users } from 'lucide-react'
import { menuUntuk } from '../../lib/roles.js'
import { useAuth } from '../../context/AuthContext.jsx'

const IKON = {
  '/dashboard': LayoutDashboard,
  '/pasien': Users,
  '/kamar': BedDouble,
  '/operasi': CalendarClock,
  '/integrasi': Plug,
}

export default function Sidebar({ onTutup }) {
  const { profile, role } = useAuth()

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="rounded-lg bg-emerald-600 p-1.5 text-white">
          <Activity size={18} />
        </span>
        <div>
          <p className="font-bold leading-tight">AdmisiRS</p>
          <p className="text-[11px] text-slate-400">Admisi &amp; Rawat Inap</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {menuUntuk(role).map((item) => {
          const Ikon = IKON[item.to] || LayoutDashboard
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onTutup}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Ikon size={16} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-400">
        Masuk sebagai
        <p className="mt-0.5 font-medium text-slate-200">{profile?.nama}</p>
        <p className="capitalize">{role}</p>
      </div>
    </aside>
  )
}
