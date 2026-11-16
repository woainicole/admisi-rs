import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { hariIni } from '../lib/format.js'

const KAMAR = 'kamar'
const PASIEN = 'pasien'
const COUNTER = ['meta', 'counter']

export function subscribePasien(cb, onError) {
  // limit 200 supaya kuota Spark aman (Bagian 11 plan).
  return onSnapshot(
    query(collection(db, PASIEN), limit(200)),
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => String(a.noRm).localeCompare(String(b.noRm)))
      cb(data)
    },
    (e) => onError?.(new Error('Gagal memuat pasien: ' + e.message)),
  )
}

function bersihkanAlergi(alergi) {
  return (alergi || []).map((a) => String(a).trim().toLowerCase()).filter(Boolean)
}

function validasiForm(form) {
  if (!form.nama?.trim()) throw new Error('Nama pasien wajib diisi.')
  if (!['L', 'P'].includes(form.jenisKelamin)) throw new Error('Jenis kelamin harus L atau P.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.tglLahir || '')) throw new Error('Tanggal lahir wajib diisi.')
  if (!form.kamarId) throw new Error('Kamar wajib dipilih.')
  if (!form.dietAwal) throw new Error('Diet awal wajib dipilih.')
}

/**
 * Satu transaksi: naikkan counter -> buat pasien -> set kamar terisi.
 * Gagal di tengah = tidak ada yang berubah.
 */
export async function daftarkanPasien(form, uid) {
  validasiForm(form)

  const counterRef = doc(db, ...COUNTER)
  const kamarRef = doc(db, KAMAR, form.kamarId)
  const pasienRef = doc(collection(db, PASIEN))

  return runTransaction(db, async (tx) => {
    // Semua pembacaan dulu, penulisan sesudahnya (aturan Firestore).
    const counterSnap = await tx.get(counterRef)
    const kamarSnap = await tx.get(kamarRef)

    if (!kamarSnap.exists()) throw new Error('Kamar tidak ditemukan.')
    const kamar = kamarSnap.data()
    if (kamar.status !== 'kosong') throw new Error(`Kamar ${kamar.bangsal} ${kamar.nomor} sudah terisi.`)

    const nomorTerakhir = counterSnap.exists() ? Number(counterSnap.data().noRmTerakhir) || 0 : 22
    const nomorBaru = nomorTerakhir + 1
    const noRm = 'RM' + String(nomorBaru).padStart(3, '0')

    const pasien = {
      noRm,
      nama: form.nama.trim(),
      jenisKelamin: form.jenisKelamin,
      tglLahir: form.tglLahir,
      diagnosa: (form.diagnosa || '').trim(),
      alergi: bersihkanAlergi(form.alergi),
      bangsal: kamar.bangsal,
      kamar: kamar.nomor,
      kamarId: form.kamarId,
      dietAwal: form.dietAwal,
      dietSaatIni: null,
      perluOperasi: !!form.perluOperasi,
      status: 'dirawat',
      tglMasuk: hariIni(),
      tglPulang: null,
      dibuatOleh: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    tx.set(counterRef, { noRmTerakhir: nomorBaru })
    tx.set(pasienRef, pasien)
    tx.update(kamarRef, { status: 'terisi', pasienId: pasienRef.id })

    return { id: pasienRef.id, ...pasien }
  })
}

/** Ubah data pasien; pindah kamar ikut ditangani dalam satu transaksi. */
export async function ubahPasien(pasien, form, uid) {
  if (!form.nama?.trim()) throw new Error('Nama pasien wajib diisi.')
  if (!['L', 'P'].includes(form.jenisKelamin)) throw new Error('Jenis kelamin harus L atau P.')
  if (!form.dietAwal) throw new Error('Diet awal wajib dipilih.')

  const pasienRef = doc(db, PASIEN, pasien.id)
  const pindahKamar = form.kamarId && form.kamarId !== pasien.kamarId
  const kamarLamaRef = pasien.kamarId ? doc(db, KAMAR, pasien.kamarId) : null
  const kamarBaruRef = pindahKamar ? doc(db, KAMAR, form.kamarId) : null

  return runTransaction(db, async (tx) => {
    const pasienSnap = await tx.get(pasienRef)
    if (!pasienSnap.exists()) throw new Error('Pasien tidak ditemukan.')

    const kamarBaruSnap = kamarBaruRef ? await tx.get(kamarBaruRef) : null
    const kamarLamaSnap = pindahKamar && kamarLamaRef ? await tx.get(kamarLamaRef) : null

    const data = {
      nama: form.nama.trim(),
      jenisKelamin: form.jenisKelamin,
      tglLahir: form.tglLahir,
      diagnosa: (form.diagnosa || '').trim(),
      alergi: bersihkanAlergi(form.alergi),
      dietAwal: form.dietAwal,
      perluOperasi: !!form.perluOperasi,
      updatedAt: serverTimestamp(),
    }

    if (pindahKamar) {
      if (!kamarBaruSnap?.exists()) throw new Error('Kamar tujuan tidak ditemukan.')
      const kamarBaru = kamarBaruSnap.data()
      if (kamarBaru.status !== 'kosong') throw new Error(`Kamar ${kamarBaru.bangsal} ${kamarBaru.nomor} sudah terisi.`)
      data.bangsal = kamarBaru.bangsal
      data.kamar = kamarBaru.nomor
      data.kamarId = form.kamarId
    }

    tx.update(pasienRef, data)
    if (pindahKamar) {
      if (kamarLamaSnap?.exists()) tx.update(kamarLamaRef, { status: 'kosong', pasienId: null })
      tx.update(kamarBaruRef, { status: 'terisi', pasienId: pasien.id })
    }

    return { ...pasien, ...data }
  })
}

/** Pulangkan pasien: status pulang + kamar jadi kosong. */
export async function pulangkanPasien(pasien) {
  const pasienRef = doc(db, PASIEN, pasien.id)
  const kamarRef = pasien.kamarId ? doc(db, KAMAR, pasien.kamarId) : null

  return runTransaction(db, async (tx) => {
    const pasienSnap = await tx.get(pasienRef)
    if (!pasienSnap.exists()) throw new Error('Pasien tidak ditemukan.')
    if (pasienSnap.data().status === 'pulang') throw new Error('Pasien ini sudah pulang.')

    const kamarSnap = kamarRef ? await tx.get(kamarRef) : null
    const tglPulang = hariIni()

    tx.update(pasienRef, { status: 'pulang', tglPulang, kamarId: null, updatedAt: serverTimestamp() })
    if (kamarSnap?.exists()) tx.update(kamarRef, { status: 'kosong', pasienId: null })

    return { ...pasien, status: 'pulang', tglPulang, kamarId: null }
  })
}

/** Dipakai integrasi: cari pasien berdasarkan nomor RM. */
export async function cariPasienByNoRm(noRm) {
  const snap = await getDocs(query(collection(db, PASIEN), where('noRm', '==', noRm), limit(1)))
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

/** Dipakai integrasi: terapkan diet terbaru dari NutriSmart. */
export async function setDietSaatIni(pasienId, jenisDiet) {
  await updateDoc(doc(db, PASIEN, pasienId), { dietSaatIni: jenisDiet, updatedAt: serverTimestamp() })
}
