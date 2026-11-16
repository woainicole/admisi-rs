export default function Spinner({ ukuran = 24, penuh = false }) {
  const lingkaran = (
    <span
      className="inline-block animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
      style={{ width: ukuran, height: ukuran }}
      role="status"
      aria-label="Memuat"
    />
  )
  if (!penuh) return lingkaran
  return <div className="flex min-h-[40vh] items-center justify-center">{lingkaran}</div>
}
