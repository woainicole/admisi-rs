import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Database, Download, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useIntegrasi } from '../context/IntegrasiContext.jsx'
import { admin } from '../lib/roles.js'
import { hariIni, formatWaktu } from '../lib/format.js'
import {
  BANGSAL,
  CHANNEL,
  JENIS_DIET,
  JENIS_KELUAR,
  SEMUA_JENIS,
  dataPasienKeluar,
} from '../lib/integrasi.js'
import { subscribePasien } from '../services/pasienService.js'
import {
  kirimKeluar,
  subscribeLog,
  tandaiDiterima,
} from '../services/integrasiService.js'
import { isiDataContoh } from '../services/seedService.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import FormField, { gayaInput } from '../components/ui/FormField.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import JsonModal from '../components/JsonModal.jsx'

const WARNA_ARAH = { keluar: 'biru', masuk: 'hijau' }
const WARNA_STATUS = { menunggu: 'abu', diterima: 'hijau', gagal: 'merah', diabaikan: 'kuning' }

const CONTOH_IMPOR = {
  versi: 1,
  eventId: '4f1c2b7a-0000-4000-8000-000000000001',
  jenis: 'diet.diperbarui',
  sumber: 'nutrismart',
  waktu: '2026-11-16T09:00:00+07:00',
  data: { noRm: 'RM001', jenisDiet: 'Diet DM', berlakuSejak: '2026-11-16' },
}

const KONTRAK_MASUK = [
  ['diet.diperbarui', 'noRm, jenisDiet, berlakuSejak'],
  ['pasien.perhatian', 'noRm, rataSisa, hari'],
]

export default function Integrasi() {
  const { user, role } = useAuth()
  const { prosesEventMasuk } = useIntegrasi()

  const [log, setLog] = useState([])
  const [pasien, setPasien] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')

  const [filterArah, setFilterArah] = useState('semua')
  const [filterStatus, setFilterStatus] = useState('semua')

  const [jenisContoh, setJenisContoh] = useState(JENIS_KELUAR[0])
  const [mengirim, setMengirim] = useState(false)
  const [imporTeks, setImporTeks] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [seed, setSeed] = useState(false)

  const [jsonBuka, setJsonBuka] = useState(false)
  const [jsonData, setJsonData] = useState(null)

  useEffect(() => {
    const lepasLog = subscribeLog(
      (data) => {
        setLog(data)
        setMemuat(false)
      },
      (e) => {
        setError(e.message)
        toast.error(e.message)
        setMemuat(false)
      },
    )
    const lepasPasien = subscribePasien(
      (data) => setPasien(data),
      (e) => toast.error(e.message),
    )
    return () => {
      lepasLog()
      lepasPasien()
    }
  }, [])

  const tampil = log.filter(
    (l) =>
      (filterArah === 'semua' || l.arah === filterArah) &&
      (filterStatus === 'semua' || l.status === filterStatus),
  )

  async function kirimContoh() {
    const p = pasien.find((x) => x.status === 'dirawat')
    if (!p) {
      toast.error('Belum ada pasien dirawat. Isi data contoh atau daftarkan pasien dulu.')
      return
    }
    let data
    if (jenisContoh === 'pasien.pulang') data = { noRm: p.noRm, tglPulang: hariIni() }
    else if (jenisContoh === 'operasi.dijadwalkan') {
      data = { noRm: p.noRm, nama: p.nama, tindakan: 'Observasi', tanggal: hariIni(), jam: '10:00' }
    } else data = dataPasienKeluar(p)

    setMengirim(true)
    try {
      const event = await kirimKeluar(jenisContoh, data, user.uid)
      setJsonData(event)
      setJsonBuka(true)
      toast.success('Event contoh dibuat. Salin JSON bila perlu.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setMengirim(false)
    }
  }

  async function impor() {
    let event
    try {
      event = JSON.parse(imporTeks)
    } catch (err) {
      toast.error('JSON tidak valid: ' + err.message)
      return
    }
    setMemproses(true)
    try {
      await prosesEventMasuk(event)
    } finally {
      setMemproses(false)
    }
  }

  async function terima(item) {
    try {
      await tandaiDiterima(item.id)
      toast.success('Event ditandai diterima.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function isiSeed() {
    setSeed(true)
    try {
      const hasil = await isiDataContoh(user.uid)
      toast(hasil.pesan)
    } catch (err) {
      toast.error('Gagal mengisi data contoh: ' + err.message)
    } finally {
      setSeed(false)
    }
  }

  const kolom = [
    { key: 'createdAt', label: 'Waktu', render: (l) => formatWaktu(l.createdAt) },
    {
      key: 'arah',
      label: 'Arah',
      render: (l) => <Badge warna={WARNA_ARAH[l.arah] ?? 'abu'}>{l.arah}</Badge>,
    },
    { key: 'jenis', label: 'Jenis' },
    { key: 'mitra', label: 'Mitra' },
    { key: 'noRm', label: 'No. RM', render: (l) => l.noRm ?? '-' },
    {
      key: 'status',
      label: 'Status',
      render: (l) => <Badge warna={WARNA_STATUS[l.status] ?? 'abu'}>{l.status}</Badge>,
    },
    {
      key: 'pesan',
      label: 'Pesan',
      render: (l) => <span className="block max-w-xs text-xs text-slate-600">{l.pesan}</span>,
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (l) => (
        <div className="flex flex-col gap-1 whitespace-nowrap">
          <button
            onClick={() => {
              setJsonData(l.event)
              setJsonBuka(true)
            }}
            className="flex items-center gap-1 text-xs text-emerald-700 hover:underline"
          >
            <Download size={13} /> Lihat JSON
          </button>
          {l.arah === 'keluar' && l.status === 'menunggu' && (
            <button onClick={() => terima(l)} className="text-xs text-sky-700 hover:underline">
              Tandai diterima
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        judul="Integrasi"
        deskripsi="Log pertukaran event dengan NutriSmart lewat ekstensi browser."
        aksi={
          admin(role) && (
            <Button variant="secondary" onClick={isiSeed} disabled={seed}>
              <Database size={16} /> {seed ? 'Mengisi…' : 'Isi data contoh'}
            </Button>
          )
        }
      />

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 font-semibold text-slate-800">Simulator event keluar</h2>
          <p className="mb-3 text-xs text-slate-500">
            Membuat satu event contoh dan mencatatnya di log. Tanpa ekstensi, event tetap berstatus
            menunggu.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <FormField label="Jenis event" className="min-w-[200px]">
              <select
                value={jenisContoh}
                onChange={(e) => setJenisContoh(e.target.value)}
                className={gayaInput}
              >
                {JENIS_KELUAR.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </FormField>
            <Button onClick={kirimContoh} disabled={mengirim}>
              <Send size={16} /> {mengirim ? 'Mengirim…' : 'Kirim contoh'}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 font-semibold text-slate-800">Impor JSON (event masuk)</h2>
          <p className="mb-3 text-xs text-slate-500">
            Jalur uji yang sama dengan <code>EVENT_MASUK</code> dari ekstensi.
          </p>
          <FormField label="Envelope event">
            <textarea
              rows={7}
              value={imporTeks}
              onChange={(e) => setImporTeks(e.target.value)}
              className={`${gayaInput} font-mono text-xs`}
              placeholder={JSON.stringify(CONTOH_IMPOR, null, 2)}
            />
          </FormField>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={impor} disabled={memproses || !imporTeks.trim()}>
              {memproses ? 'Memproses…' : 'Proses sebagai event masuk'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setImporTeks(JSON.stringify(CONTOH_IMPOR, null, 2))}
            >
              Isi contoh diet
            </Button>
          </div>
        </section>
      </div>

      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">Log event</h2>

        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={filterArah}
            onChange={(e) => setFilterArah(e.target.value)}
            className={gayaInput + ' max-w-[170px]'}
          >
            <option value="semua">Semua arah</option>
            <option value="keluar">Keluar</option>
            <option value="masuk">Masuk</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={gayaInput + ' max-w-[170px]'}
          >
            <option value="semua">Semua status</option>
            <option value="menunggu">Menunggu</option>
            <option value="diterima">Diterima</option>
            <option value="gagal">Gagal</option>
            <option value="diabaikan">Diabaikan</option>
          </select>
        </div>

        {memuat ? (
          <Spinner penuh />
        ) : (
          <DataTable
            kolom={kolom}
            data={tampil}
            cariFields={['jenis', 'mitra', 'noRm', 'pesan', 'status']}
            placeholderCari="Cari jenis, no. RM, pesan…"
            perHalaman={10}
            kosong={
              <EmptyState
                judul="Belum ada log"
                pesan="Event keluar/masuk akan muncul di sini setelah dikirim atau diimpor."
              />
            }
          />
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">Panel kontrak v1</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Event keluar (AdmisiRS → NutriSmart)</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">Field data wajib</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2 font-mono text-xs">pasien.masuk</td>
                    <td className="px-3 py-2 text-xs">
                      noRm, nama, jenisKelamin, tglLahir, bangsal, kamar, diagnosa, alergi[], dietAwal, tglMasuk
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-xs">pasien.diperbarui</td>
                    <td className="px-3 py-2 text-xs">Sama dengan pasien.masuk (data lengkap)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-xs">pasien.pulang</td>
                    <td className="px-3 py-2 text-xs">noRm, tglPulang</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-xs">operasi.dijadwalkan</td>
                    <td className="px-3 py-2 text-xs">noRm, nama, tindakan, tanggal, jam</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Event masuk (NutriSmart → AdmisiRS)</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">Field data wajib</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {KONTRAK_MASUK.map(([jenis, field]) => (
                    <tr key={jenis}>
                      <td className="px-3 py-2 font-mono text-xs">{jenis}</td>
                      <td className="px-3 py-2 text-xs">{field}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 mt-4 text-sm font-medium text-slate-700">Kosakata bersama</h3>
            <dl className="space-y-1 text-xs text-slate-600">
              <div>
                <dt className="inline font-medium">channel:</dt> <dd className="inline font-mono">{CHANNEL}</dd>
              </div>
              <div>
                <dt className="inline font-medium">bangsal:</dt> <dd className="inline">{BANGSAL.join(', ')}</dd>
              </div>
              <div>
                <dt className="inline font-medium">diet:</dt> <dd className="inline">{JENIS_DIET.join(', ')}</dd>
              </div>
              <div>
                <dt className="inline font-medium">tipe pesan:</dt>{' '}
                <dd className="inline font-mono">EVENT_KELUAR, EVENT_MASUK, ACK, ACK_BALIK</dd>
              </div>
              <div>
                <dt className="inline font-medium">jenis dikenal:</dt>{' '}
                <dd className="inline font-mono">{SEMUA_JENIS.join(', ')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <JsonModal
        open={jsonBuka}
        onClose={() => setJsonBuka(false)}
        judul="JSON event"
        data={jsonData}
      />
    </div>
  )
}
