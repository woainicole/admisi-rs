import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export function subscribeOperasi(cb, onError) {
  return onSnapshot(
    collection(db, 'jadwalOperasi'),
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => `${a.tanggal}${a.jam}`.localeCompare(`${b.tanggal}${b.jam}`))
      cb(data)
    },
    (e) => onError?.(new Error('Gagal memuat jadwal operasi: ' + e.message)),
  )
}

/** Jadwalkan operasi + tandai pasien perlu operasi (satu batch). */
export async function jadwalkanOperasi(form) {
  if (!form.pasienId) throw new Error('Pasien wajib dipilih.')
  if (!form.tindakan?.trim()) throw new Error('Tindakan wajib diisi.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.tanggal || '')) throw new Error('Tanggal wajib diisi.')
  if (!/^\d{2}:\d{2}$/.test(form.jam || '')) throw new Error('Jam wajib diisi.')

  const batch = writeBatch(db)
  const ref = doc(collection(db, 'jadwalOperasi'))

  batch.set(ref, {
    pasienId: form.pasienId,
    noRm: form.noRm,
    namaPasien: form.namaPasien,
    tindakan: form.tindakan.trim(),
    tanggal: form.tanggal,
    jam: form.jam,
    dokter: (form.dokter || '').trim(),
    status: 'terjadwal',
    catatan: (form.catatan || '').trim(),
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'pasien', form.pasienId), {
    perluOperasi: true,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return { id: ref.id, ...form, status: 'terjadwal' }
}

export async function ubahStatusOperasi(id, status) {
  if (!['selesai', 'batal'].includes(status)) throw new Error('Status operasi tidak dikenal.')
  await updateDoc(doc(db, 'jadwalOperasi', id), { status })
}
