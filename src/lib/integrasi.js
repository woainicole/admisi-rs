/**
 * Kontrak integrasi v1 (Bagian 6 plan). Fungsi di sini murni: tanpa Firebase.
 * Perubahan bentuk pesan HARUS disepakati dengan NutriSmart + ekstensi.
 */

export const CHANNEL = 'rs-integrasi'

export const BANGSAL = ['Melati', 'Mawar', 'VIP']
export const JENIS_DIET = ['Normal', 'Diet DM', 'Rendah Garam', 'Diet Lunak', 'Diet Cair']
export const JENIS_KELAMIN = ['L', 'P']

export const JENIS_KELUAR = ['pasien.masuk', 'pasien.diperbarui', 'pasien.pulang', 'operasi.dijadwalkan']
export const JENIS_MASUK = ['diet.diperbarui', 'pasien.perhatian']
export const SEMUA_JENIS = [...JENIS_KELUAR, ...JENIS_MASUK]

const POLA_NORM = /^RM\d{3,}$/
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/
const POLA_JAM = /^\d{2}:\d{2}$/

/** Waktu ISO 8601 dengan offset Jakarta (+07:00), sesuai Bagian 6.1. */
export function waktuJakarta(tanggal = new Date()) {
  const bagian = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(tanggal)
    .reduce((hasil, p) => ({ ...hasil, [p.type]: p.value }), {})
  return `${bagian.year}-${bagian.month}-${bagian.day}T${bagian.hour}:${bagian.minute}:${bagian.second}+07:00`
}

export function buatEvent(jenis, data, sumber = 'admisirs') {
  return {
    versi: 1,
    eventId: crypto.randomUUID(),
    jenis,
    sumber,
    waktu: waktuJakarta(),
    data,
  }
}

/** Pancarkan event keluar untuk ditangkap content script ekstensi. */
export function postingKeluar(event) {
  window.postMessage({ channel: CHANNEL, tipe: 'EVENT_KELUAR', event }, window.location.origin)
}

const WAJIB = {
  'pasien.masuk': ['noRm', 'nama', 'jenisKelamin', 'tglLahir', 'bangsal', 'kamar', 'diagnosa', 'dietAwal', 'tglMasuk'],
  'pasien.diperbarui': ['noRm', 'nama', 'jenisKelamin', 'tglLahir', 'bangsal', 'kamar', 'diagnosa', 'dietAwal', 'tglMasuk'],
  'pasien.pulang': ['noRm', 'tglPulang'],
  'operasi.dijadwalkan': ['noRm', 'nama', 'tindakan', 'tanggal', 'jam'],
  'diet.diperbarui': ['noRm', 'jenisDiet', 'berlakuSejak'],
  'pasien.perhatian': ['noRm', 'rataSisa', 'hari'],
}

function kosong(nilai) {
  return nilai === undefined || nilai === null || String(nilai).trim() === ''
}

/** Mengembalikan { ok, pesan }. Pesan selalu Bahasa Indonesia. */
export function validasiEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { ok: false, pesan: 'Event bukan objek JSON.' }
  }
  if (event.versi !== 1) return { ok: false, pesan: 'Versi event tidak dikenal (harus 1).' }
  if (typeof event.eventId !== 'string' || event.eventId.trim() === '') {
    return { ok: false, pesan: 'eventId wajib berupa teks.' }
  }
  if (!SEMUA_JENIS.includes(event.jenis)) {
    return { ok: false, pesan: `Jenis event "${event.jenis ?? '-'}" tidak dikenal.` }
  }
  if (!['admisirs', 'nutrismart'].includes(event.sumber)) {
    return { ok: false, pesan: 'sumber harus "admisirs" atau "nutrismart".' }
  }
  if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) {
    return { ok: false, pesan: 'data wajib berupa objek.' }
  }

  const data = event.data
  for (const field of WAJIB[event.jenis]) {
    if (kosong(data[field])) return { ok: false, pesan: `Field "${field}" wajib diisi pada ${event.jenis}.` }
  }

  if (!POLA_NORM.test(data.noRm)) return { ok: false, pesan: 'noRm harus berformat RM diikuti minimal 3 angka (contoh RM023).' }

  if (event.jenis === 'pasien.masuk' || event.jenis === 'pasien.diperbarui') {
    if (!JENIS_KELAMIN.includes(data.jenisKelamin)) return { ok: false, pesan: 'jenisKelamin harus "L" atau "P".' }
    if (!BANGSAL.includes(data.bangsal)) return { ok: false, pesan: `bangsal harus salah satu: ${BANGSAL.join(', ')}.` }
    if (!JENIS_DIET.includes(data.dietAwal)) return { ok: false, pesan: `dietAwal harus salah satu: ${JENIS_DIET.join(', ')}.` }
    if (!POLA_TANGGAL.test(data.tglLahir)) return { ok: false, pesan: 'tglLahir harus format YYYY-MM-DD.' }
    if (!POLA_TANGGAL.test(data.tglMasuk)) return { ok: false, pesan: 'tglMasuk harus format YYYY-MM-DD.' }
    if (data.alergi !== undefined && !Array.isArray(data.alergi)) return { ok: false, pesan: 'alergi harus berupa array.' }
  }

  if (event.jenis === 'pasien.pulang' && !POLA_TANGGAL.test(data.tglPulang)) {
    return { ok: false, pesan: 'tglPulang harus format YYYY-MM-DD.' }
  }

  if (event.jenis === 'operasi.dijadwalkan') {
    if (!POLA_TANGGAL.test(data.tanggal)) return { ok: false, pesan: 'tanggal harus format YYYY-MM-DD.' }
    if (!POLA_JAM.test(data.jam)) return { ok: false, pesan: 'jam harus format HH:mm.' }
  }

  if (event.jenis === 'diet.diperbarui') {
    if (!JENIS_DIET.includes(data.jenisDiet)) {
      return { ok: false, pesan: `jenisDiet harus salah satu: ${JENIS_DIET.join(', ')}.` }
    }
    if (!POLA_TANGGAL.test(data.berlakuSejak)) return { ok: false, pesan: 'berlakuSejak harus format YYYY-MM-DD.' }
  }

  return { ok: true, pesan: 'Event valid.' }
}

/** Data pasien yang dikirim ke NutriSmart (lengkap, bukan selisih). */
export function dataPasienKeluar(pasien) {
  return {
    noRm: pasien.noRm,
    nama: pasien.nama,
    jenisKelamin: pasien.jenisKelamin,
    tglLahir: pasien.tglLahir,
    bangsal: pasien.bangsal,
    kamar: pasien.kamar,
    diagnosa: pasien.diagnosa,
    alergi: pasien.alergi ?? [],
    dietAwal: pasien.dietAwal,
    perluOperasi: !!pasien.perluOperasi,
    tglMasuk: pasien.tglMasuk,
  }
}
