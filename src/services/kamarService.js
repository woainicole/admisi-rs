import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { BANGSAL } from '../lib/integrasi.js'

export function subscribeKamar(cb, onError) {
  // Tanpa orderBy -> tidak butuh composite index; pengurutan di klien.
  return onSnapshot(
    collection(db, 'kamar'),
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => `${a.bangsal}${a.nomor}`.localeCompare(`${b.bangsal}${b.nomor}`))
      cb(data)
    },
    (e) => onError?.(new Error('Gagal memuat kamar: ' + e.message)),
  )
}

export async function createKamar({ bangsal, nomor }) {
  if (!BANGSAL.includes(bangsal)) throw new Error('Bangsal tidak dikenal.')
  if (!nomor?.trim()) throw new Error('Nomor kamar wajib diisi.')
  await addDoc(collection(db, 'kamar'), {
    bangsal,
    nomor: nomor.trim().toUpperCase(),
    status: 'kosong',
    pasienId: null,
  })
}

export async function deleteKamar(id) {
  await deleteDoc(doc(db, 'kamar', id))
}
