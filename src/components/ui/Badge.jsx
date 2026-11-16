const WARNA = {
  hijau: 'bg-emerald-100 text-emerald-700',
  merah: 'bg-red-100 text-red-700',
  kuning: 'bg-amber-100 text-amber-800',
  biru: 'bg-sky-100 text-sky-700',
  abu: 'bg-slate-100 text-slate-600',
}

export default function Badge({ warna = 'abu', children }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${WARNA[warna] || WARNA.abu}`}>
      {children}
    </span>
  )
}
