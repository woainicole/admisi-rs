export default function StatCard({ label, nilai, ikon, keterangan }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="text-emerald-600">{ikon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-800">{nilai}</p>
      {keterangan && <p className="mt-1 text-xs text-slate-400">{keterangan}</p>}
    </div>
  )
}
