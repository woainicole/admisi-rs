export default function PageHeader({ judul, deskripsi, aksi }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{judul}</h1>
        {deskripsi && <p className="mt-1 text-sm text-slate-500">{deskripsi}</p>}
      </div>
      {aksi}
    </div>
  )
}
