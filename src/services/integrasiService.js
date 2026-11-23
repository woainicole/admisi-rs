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

// ─── Transfer seamless ke NutriSmart (tanpa ekstensi) ───────────────────

const SUPA_URL = import.meta.env.VITE_NUTRISMART_SUPABASE_URL
const SUPA_KEY = import.meta.env.VITE_NUTRISMART_SUPABASE_ANON_KEY

/**
 * Kirim event langsung ke Supabase RPC NutriSmart tanpa ekstensi.
 * Gunakan ini selain/sebagai pengganti postingKeluar().
 * @returns {{ ok: boolean, pesan: string }}
 */
export async function kirimKeNutriSmart(event) {
  if (!SUPA_URL || !SUPA_KEY) {
    return { ok: false, pesan: 'VITE_NUTRISMART_SUPABASE_URL/KEY belum dikonfigurasi.' }
  }
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/terima_event_integrasi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
      },
      body: JSON.stringify({ p_event: event }),
    })
    if (!res.ok) {
      const teks = await res.text()
      return { ok: false, pesan: `HTTP ${res.status}: ${teks}` }
    }
    const hasil = await res.json()
    return hasil  // { ok, pesan, status, ... }
  } catch (e) {
    return { ok: false, pesan: 'Gagal menghubungi NutriSmart: ' + e.message }
  }
}

/**
 * Kirim event keluar AND langsung teruskan ke NutriSmart (seamless).
 * Menulis log dengan status akhir dari NutriSmart, bukan "menunggu".
 */
export async function kirimKeluarSeamless(jenis, data, uid) {
  const event = buatEvent(jenis, data)

  // Kirim ke NutriSmart
  const hasil = await kirimKeNutriSmart(event)
  const status = hasil?.ok ? 'diterima' : 'gagal'
  const pesan = hasil?.pesan ?? 'Tidak ada respons dari NutriSmart.'

  // Catat log
  await setDoc(doc(db, LOG, event.eventId), {
    arah: 'keluar',
    jenis,
    mitra: 'nutrismart',
    status,
    pesan,
    noRm: data?.noRm ?? null,
    event,
    createdAt: serverTimestamp(),
    oleh: uid,
  })

  // Juga emit postMessage agar ekstensi (jika ada) tetap bisa menangkap
  postingKeluar(event)
  return { event, ...hasil }
}
