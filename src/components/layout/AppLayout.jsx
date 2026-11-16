import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function AppLayout() {
  const [menuBuka, setMenuBuka] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar tetap di layar lebar, bisa dibuka-tutup di layar kecil. */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <Sidebar />
      </div>

      {menuBuka && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuBuka(false)} />
          <div className="relative z-50">
            <Sidebar onTutup={() => setMenuBuka(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onBukaMenu={() => setMenuBuka(true)} />
        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
