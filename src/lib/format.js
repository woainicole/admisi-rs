// Tanggal bisnis selalu zona Asia/Jakarta. Jangan pakai toISOString(): bisa geser hari.
const ZONA = { timeZone: 'Asia/Jakarta' }

/** Tanggal hari ini di Jakarta, format YYYY-MM-DD. */
export function hariIni() {
  return new Intl.DateTimeFormat('en-CA', {
    ...ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** '2026-11-16' -> '16 Nov 2026'. */
export function formatTanggal(tanggal) {
  if (!tanggal) return '-'
  const [tahun, bulan, hari] = tanggal.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(tahun, bulan - 1, hari)))
}

/** Timestamp Firestore -> '16 Nov 2026, 09.30'. */
export function formatWaktu(waktu) {
  if (!waktu) return '-'
  const tanggal = typeof waktu.toDate === 'function' ? waktu.toDate() : new Date(waktu)
  return new Intl.DateTimeFormat('id-ID', {
    ...ZONA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(tanggal)
}
