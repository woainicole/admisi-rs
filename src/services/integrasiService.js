import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { buatEvent, postingKeluar, validasiEvent } from '../lib/integrasi.js'
import { cariPasienByNoRm, setDietSaatIni } from './pasienService.js'

const LOG = 'integrasiLog'

export function subscribeLog(cb, onError) {
  // limit 200 sesuai Bagian 11 plan (hemat kuota Spark).
  return onSnapshot(
    query(collection(db, LOG), limit(200)),
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      cb(data)
    },
    (e) => onError?.(new Error('Gagal memuat log integrasi: ' + e.message)),
  )
}

/**
 * Event keluar: tulis log status "menunggu" lalu pancarkan ke ekstensi.
 * (Bagian 6.4: website -> ekstensi.)
 */
export async function kirimKeluar(jenis, data, uid) {
  const event = buatEvent(jenis, data)
  await setDoc(doc(db, LOG, event.eventId), {
    arah: 'keluar',
    jenis,
    mitra: 'ekstensi',
    status: 'menunggu',
    pesan: 'Menunggu diteruskan ekstensi browser.',
    noRm: data?.noRm ?? null,
    event,
    createdAt: serverTimestamp(),
    oleh: uid,
  })
  postingKeluar(event)
  return event
}

function tulisLogMasuk(event, uid, status, pesan) {
  return setDoc(doc(db, LOG, event.eventId), {
    arah: 'masuk',
    jenis: event.jenis,
    mitra: 'nutrismart',
    status,
    pesan,
    noRm: event.data?.noRm ?? null,
    event,
    createdAt: serverTimestamp(),
    oleh: uid,
  })
}

/**
 * Terapkan event masuk (dari ekstensi atau simulator Impor JSON).
 * Dokumen log memakai eventId sebagai ID, jadi duplikat terdeteksi otomatis.
 */
export async function terapkanEventMasuk(event, uid) {
  const logRef = doc(db, LOG, event?.eventId ?? 'tidak-ada')

  if (event?.eventId) {
    const lama = await getDoc(logRef)
    if (lama.exists()) {
      await updateDoc(logRef, { status: 'diabaikan', pesan: 'Duplikat, diabaikan.' })
      return { ok: true, pesan: 'Duplikat, diabaikan.', duplikat: true }
    }
  }

  const cek = validasiEvent(event)
  if (!cek.ok) {
    if (event?.eventId) await tulisLogMasuk(event, uid, 'gagal', cek.pesan)
    return { ok: false, pesan: cek.pesan }
  }

  if (event.jenis === 'diet.diperbarui') {
    const pasien = await cariPasienByNoRm(event.data.noRm)
    if (!pasien) {
      const pesan = `Pasien ${event.data.noRm} belum terdaftar di AdmisiRS.`
      await tulisLogMasuk(event, uid, 'gagal', pesan)
      return { ok: false, pesan }
    }
    await setDietSaatIni(pasien.id, event.data.jenisDiet)
    const pesan = `Diet ${event.data.noRm} diperbarui menjadi "${event.data.jenisDiet}".`
    await tulisLogMasuk(event, uid, 'diterima', pesan)
    return { ok: true, pesan }
  }

  const pesan = `Event masuk "${event.jenis}" belum didukung AdmisiRS.`
  await tulisLogMasuk(event, uid, 'gagal', pesan)
  return { ok: false, pesan }
}

/** Demo tanpa ekstensi: tandai event keluar sebagai diterima. */
export async function tandaiDiterima(eventId) {
  await updateDoc(doc(db, LOG, eventId), {
    status: 'diterima',
    pesan: 'Ditandai diterima manual oleh petugas.',
  })
}

/** Hasil ACK_BALIK dari ekstensi. */
export async function catatAckBalik(eventId, ok, pesan) {
  await updateDoc(doc(db, LOG, eventId), {
    status: ok ? 'diterima' : 'gagal',
    pesan: pesan || (ok ? 'Diterima tujuan.' : 'Ditolak tujuan.'),
  })
}
