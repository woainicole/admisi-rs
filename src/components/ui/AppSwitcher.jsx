import { useState } from 'react'
import { ExternalLink, X, Hospital, Utensils } from 'lucide-react'

const NUTRISMART_URL = 'https://nutrismart-gamma.vercel.app'

export default function AppSwitcher() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Buka Aplikasi Lain"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
      >
        {open
          ? <X size={20} />
          : <span className="text-lg font-bold">⇄</span>
        }
      </button>

      {/* Panel popup */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 bg-emerald-600 text-white">
            <p className="text-xs font-medium opacity-80">Kamu sedang di</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Hospital size={16} />
              <span className="font-semibold text-sm">AdmisiRS</span>
            </div>
          </div>

          {/* Navigasi ke app lain */}
          <div className="p-3">
            <p className="text-xs text-gray-400 mb-2 px-1">Pindah ke aplikasi lain</p>
            <a
              href={NUTRISMART_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors shrink-0">
                <Utensils size={18} className="text-emerald-700" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">NutriSmart</p>
                <p className="text-xs text-gray-400">Manajemen Gizi & Nutrisi</p>
              </div>
              <ExternalLink size={14} className="text-gray-400 ml-auto shrink-0" />
            </a>
          </div>
        </div>
      )}
    </>
  )
}
