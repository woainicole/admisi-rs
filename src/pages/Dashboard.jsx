import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BedDouble, CalendarClock, Plug, Users } from 'lucide-react'
import { formatTanggal, formatWaktu, hariIni } from '../lib/format.js'
import { subscribeKamar } from '../services/kamarService.js'
import { subscribePasien } from '../services/pasienService.js'
import { subscribeOperasi } from '../services/operasiService.js'
import { subscribeLog } from '../services/integrasiService.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const WARNA_STATUS = { menunggu: 'abu', diterima: 'hijau', gagal: 'merah', diabaikan: 'kuning' }

export default function Dashboard() {
  const [pasien, setPasien] = useState([])
  const [kamar, setKamar] = useState([])
  const [operasi, setOperasi] = useState([])
  const [log, setLog] = useState([])
  const [dimuat, setDimuat] = useState({ pasien: false, kamar: false, operasi: false, log: false })
  const [error, setError] = useState('')

  useEffect(() => {
    function gagal(pesan) {
      return (e) => {
        setError(pesan)
        toast.error(e.message)
      }
    }
    function selesai(kunci) {
      return (data) => {
        if (kunci === 'pasien') setPasien(data)
        if (kunci === 'kamar') setKamar(data)
        if (kunci === 'operasi') setOperasi(data)
        if (kunci === 'log') setLog(data)
        setDimuat((d) => ({ ...d, [kunci]: true }))
      }
    }

    const lepas = [
      subscribePasien(selesai('pasien'), (e) => {
        gagal('Gagal memuat pasien.')(e)
        setDimuat((d) => ({ ...d, pasien: true }))
      }),
      subscribeKamar(selesai('kamar'), (e) => {
        gagal('Gagal memuat kamar.')(e)
        setDimuat((d) => ({ ...d, kamar: true }))
      }),
      subscribeOperasi(selesai('operasi'), (e) => {
        gagal('Gagal memuat operasi.')(e)
        setDimuat((d) => ({ ...d, operasi: true }))
      }),
      subscribeLog(selesai('log'), (e) => {
        gagal('Gagal memuat log integrasi.')(e)
        setDimuat((d) => ({ ...d, log: true }))
      }),
    ]
    return () => lepas.forEach((f) => f())
  }, [])

  const semuaDimuat = Object.values(dimuat).every(Boolean)

  if (!semuaDimuat) return <Spinner penuh />

  const dirawat = pasien.filter((p) => p.status === 'dirawat')
  const kamarKosong = kamar.filter((k) => k.status === 'kosong').length
  const kamarTerisi = kamar.filter((k) => k.status === 'terisi').length
  const operasiHariIni = operasi.filter((o) => o.tanggal === hariIni() && o.status === 'terjadwal')
  const perluPerhatian = log.filter((l) => l.status === 'menunggu' || l.status === 'gagal')
  const operasiTerdekat = operasi
    .filter((o) => o.status === 'terjadwal' && o.tanggal >= hariIni())
    .slice(0, 5)

  return (
    <div>
      <PageHeader
        judul="Dashboard"
        deskripsi="Ringkasan rawat inap dan integrasi NutriSmart."
      />

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pasien dirawat" nilai={dirawat.length} ikon={<Users size={18} />} />
        <StatCard
          label="Kamar kosong / terisi"
          nilai={`${kamarKosong} / ${kamarTerisi}`}
          ikon={<BedDouble size={18} />}
          keterangan={`${kamar.length} kamar terdaftar`}
        />
        <StatCard
          label="Operasi hari ini"
          nilai={operasiHariIni.length}
          ikon={<CalendarClock size={18} />}
          keterangan="Status terjadwal"
        />
        <StatCard
          label="Event perlu perhatian"
          nilai={perluPerhatian.length}
          ikon={<Plug size={18} />}
          keterangan="Menunggu atau gagal"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-800">5 event terakhir</h2>
          {log.length === 0 ? (
            <EmptyState judul="Belum ada event" pesan="Kirim event dari halaman Pasien atau Integrasi." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {log.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{l.jenis}</p>
                    <p className="text-xs text-slate-500">
                      {l.arah} · {l.noRm ?? '-'} · {formatWaktu(l.createdAt)}
                    </p>
                  </div>
                  <Badge warna={WARNA_STATUS[l.status] ?? 'abu'}>{l.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Operasi terdekat</h2>
          {operasiTerdekat.length === 0 ? (
            <EmptyState judul="Belum ada operasi terjadwal" pesan="Jadwalkan dari halaman Jadwal Operasi." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {operasiTerdekat.map((o) => (
                <li key={o.id} className="py-2">
                  <p className="text-sm font-medium text-slate-700">
                    {o.namaPasien} · {o.tindakan}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatTanggal(o.tanggal)} pukul {o.jam} · {o.dokter || 'dokter belum diisi'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
