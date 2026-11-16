import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { CHANNEL } from '../lib/integrasi.js'
import { useAuth } from './AuthContext.jsx'
import { catatAckBalik, terapkanEventMasuk } from '../services/integrasiService.js'

const KUNCI_ANTREAN = 'antreanIntegrasi'

function ambilAntrean() {
  try {
    const isi = JSON.parse(sessionStorage.getItem(KUNCI_ANTREAN) || '[]')
    return Array.isArray(isi) ? isi : []
  } catch {
    return []
  }
}

function simpanAntrean(event) {
  const antrean = ambilAntrean()
  antrean.push(event)
  sessionStorage.setItem(KUNCI_ANTREAN, JSON.stringify(antrean))
}

function kosongkanAntrean() {
  sessionStorage.removeItem(KUNCI_ANTREAN)
}

const IntegrasiContext = createContext(null)

export function IntegrasiProvider({ children }) {
  const { user } = useAuth()
  const userRef = useRef(user)
  userRef.current = user

  // Dipakai listener postMessage DAN simulator Impor JSON (jalur uji yang sama).
  const prosesEventMasuk = useCallback(async (event) => {
    if (!userRef.current) return { ok: false, pesan: 'Belum login.' }
    try {
      const hasil = await terapkanEventMasuk(event, userRef.current.uid)
      if (hasil.ok) toast.success(hasil.pesan)
      else toast.error(hasil.pesan)
      return hasil
    } catch (e) {
      const pesan = e?.message || 'Gagal memproses event masuk.'
      toast.error(pesan)
      return { ok: false, pesan }
    }
  }, [])

  useEffect(() => {
    function kirimAck(eventId, ok, pesan) {
      window.postMessage({ channel: CHANNEL, tipe: 'ACK', eventId, ok, pesan }, window.location.origin)
    }

    function onMessage(e) {
      // Bagian 6.4: hanya window yang sama dan channel yang dikenal.
      if (e.source !== window) return
      const pesan = e.data
      if (!pesan || pesan.channel !== CHANNEL) return

      if (pesan.tipe === 'EVENT_KELUAR') return // milik website ini, untuk ekstensi
      if (pesan.tipe !== 'EVENT_MASUK' && pesan.tipe !== 'ACK_BALIK') return

      if (pesan.tipe === 'ACK_BALIK') {
        if (!userRef.current) return
        catatAckBalik(pesan.eventId, !!pesan.ok, pesan.pesan).catch(() => {})
        return
      }

      if (!userRef.current) {
        simpanAntrean(pesan.event)
        toast('Event masuk ditahan dulu, akan diproses setelah login.')
        return
      }

      prosesEventMasuk(pesan.event).then((hasil) => kirimAck(pesan.event?.eventId, hasil.ok, hasil.pesan))
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [prosesEventMasuk])

  // Setelah login, proses event yang sempat ditahan.
  useEffect(() => {
    if (!user) return
    const antrean = ambilAntrean()
    if (antrean.length === 0) return
    kosongkanAntrean()
    antrean.forEach((event) => prosesEventMasuk(event))
  }, [user, prosesEventMasuk])

  return <IntegrasiContext.Provider value={{ prosesEventMasuk }}>{children}</IntegrasiContext.Provider>
}

export function useIntegrasi() {
  const context = useContext(IntegrasiContext)
  if (!context) throw new Error('useIntegrasi harus dipakai di dalam IntegrasiProvider')
  return context
}
