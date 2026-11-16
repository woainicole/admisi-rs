import { Inbox } from 'lucide-react'

export default function EmptyState({ judul = 'Belum ada data', pesan = '', aksi = null }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Inbox className="text-slate-300" size={36} />
      <p className="font-medium text-slate-600">{judul}</p>
      {pesan && <p className="max-w-sm text-sm text-slate-500">{pesan}</p>}
      {aksi}
    </div>
  )
}
