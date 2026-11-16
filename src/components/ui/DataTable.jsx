import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import EmptyState from './EmptyState.jsx'

/**
 * Tabel dengan pencarian klien + paginasi.
 * Pencarian memfilter SELURUH data, bukan hanya halaman yang sedang tampil.
 */
export default function DataTable({ kolom, data, cariFields = [], placeholderCari = 'Cari…', perHalaman = 10, kosong }) {
  const [cari, setCari] = useState('')
  const [halaman, setHalaman] = useState(1)

  const hasil = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    if (!kata || cariFields.length === 0) return data
    return data.filter((baris) =>
      cariFields.some((field) => String(baris[field] ?? '').toLowerCase().includes(kata)),
    )
  }, [cari, data, cariFields])

  const totalHalaman = Math.max(1, Math.ceil(hasil.length / perHalaman))
  const halamanAman = Math.min(halaman, totalHalaman)
  const potongan = hasil.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman)

  return (
    <div className="space-y-3">
      {cariFields.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={cari}
            onChange={(e) => {
              setCari(e.target.value)
              setHalaman(1)
            }}
            placeholder={placeholderCari}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {kolom.map((k) => (
                <th key={k.key} className="px-3 py-2 font-medium">
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {potongan.map((baris, i) => (
              <tr key={baris.id ?? i} className="hover:bg-slate-50">
                {kolom.map((k) => (
                  <td key={k.key} className="px-3 py-2 align-middle">
                    {k.render ? k.render(baris) : (baris[k.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {hasil.length === 0 && (kosong || <EmptyState judul="Tidak ada data" pesan="Belum ada data yang cocok." />)}
      </div>

      {hasil.length > perHalaman && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            {hasil.length} data · halaman {halamanAman}/{totalHalaman}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              onClick={() => setHalaman((h) => Math.max(1, h - 1))}
              disabled={halamanAman === 1}
            >
              Sebelumnya
            </button>
            <button
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
              disabled={halamanAman === totalHalaman}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
