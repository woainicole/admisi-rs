import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { hariIni, formatTanggal } from '../lib/format.js'
import { subscribePasien } from '../services/pasienService.js'
import { jadwalkanOperasi, subscribeOperasi, ubahStatusOperasi } from '../services/operasiService.js'
import { kirimKeluar } from '../services/integrasiService.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import FormField, { gayaInput } from '../components/ui/FormField.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import JsonModal from '../components/JsonModal.jsx'

const FORM_KOSONG = { pasienId: '', tindakan: '', tanggal: hariIni(), jam: '09:00', dokter: '', catatan: '' }

const WARNA_STATUS = { terjadwal: 'biru', selesai: 'hijau', batal: 'merah' }

export default function Operasi() {
  const { user } = useAuth()

  const [operasi, setOperasi] = useState([])
  const [pasien, setPasien] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')

  const [formBuka, setFormBuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [simpan, setSimpan] = useState(false)
  const [prosesId, setProsesId] = useState(null)

  const [eventTerakhir, setEventTerakhir] = useState(null)
  const [jsonBuka, setJsonBuka] = useState(false)

  useEffect(() => {
    const lepasOperasi = subscribeOperasi(
      (data) => {
        setOperasi(data)
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
      lepasOperasi()
      lepasPasien()
    }
  }, [])

  const pasienDirawat = pasien.filter((p) => p.status === 'dirawat')

  async function simpanJadwal(e) {
    e.preventDefault()
    const pilihan = pasienDirawat.find((p) => p.id === form.pasienId)
    if (!pilihan) {
      toast.error('Pilih pasien yang sedang dirawat.')
      return
    }
    setSimpan(true)
    try {
      const hasil = await jadwalkanOperasi({
        ...form,
        noRm: pilihan.noRm,
        namaPasien: pilihan.nama,
      })
      const event = await kirimKeluar(
        'operasi.dijadwalkan',
        {
          noRm: hasil.noRm,
          nama: hasil.namaPasien,
          tindakan: hasil.tindakan,
          tanggal: hasil.tanggal,
          jam: hasil.jam,
        },
        user.uid,
      )
      setEventTerakhir(event)
      toast.success('Operasi dijadwalkan. Data siap diteruskan.')
      setForm(FORM_KOSONG)
      setFormBuka(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSimpan(false)
    }
  }

  async function ubahStatus(item, status) {
    setProsesId(item.id)
    try {
      await ubahStatusOperasi(item.id, status)
      toast.success(status === 'selesai' ? 'Operasi ditandai selesai.' : 'Operasi dibatalkan.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProsesId(null)
    }
  }

  const kolom = [
    { key: 'tanggal', label: 'Tanggal', render: (o) => formatTanggal(o.tanggal) },
    { key: 'jam', label: 'Jam' },
    {
      key: 'namaPasien',
      label: 'Pasien',
      render: (o) => (
        <div>
          <p className="font-medium text-slate-800">{o.namaPasien}</p>
          <p className="text-xs text-slate-500">{o.noRm}</p>
        </div>
      ),
    },
    { key: 'tindakan', label: 'Tindakan' },
    { key: 'dokter', label: 'Dokter', render: (o) => o.dokter || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (o) => <Badge warna={WARNA_STATUS[o.status] ?? 'abu'}>{o.status}</Badge>,
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (o) =>
        o.status === 'terjadwal' ? (
          <div className="flex gap-2 whitespace-nowrap">
            <button
              onClick={() => ubahStatus(o, 'selesai')}
              disabled={prosesId === o.id}
              className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
            >
              Selesai
            </button>
            <button
              onClick={() => ubahStatus(o, 'batal')}
              disabled={prosesId === o.id}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">{o.catatan || '-'}</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        judul="Jadwal Operasi"
        deskripsi="Operasi terjadwal untuk pasien rawat inap."
        aksi={
          <Button onClick={() => setFormBuka(true)}>
            <CalendarPlus size={16} /> Jadwalkan Operasi
          </Button>
        }
      />

      {eventTerakhir && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Event terakhir: <b>{eventTerakhir.jenis}</b> · {eventTerakhir.data?.noRm}
          <Button variant="secondary" onClick={() => setJsonBuka(true)}>
            Lihat JSON
          </Button>
        </div>
      )}

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {memuat ? (
        <Spinner penuh />
      ) : (
        <DataTable
          kolom={kolom}
          data={operasi}
          cariFields={['noRm', 'namaPasien', 'tindakan', 'dokter', 'tanggal']}
          placeholderCari="Cari pasien, no. RM, tindakan, dokter…"
          kosong={
            <EmptyState
              judul="Belum ada jadwal operasi"
              pesan='Klik "Jadwalkan Operasi" untuk menambah jadwal.'
            />
          }
        />
      )}

      <Modal
        open={formBuka}
        onClose={() => setFormBuka(false)}
        judul="Jadwalkan Operasi"
        lebar="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormBuka(false)} disabled={simpan}>
              Batal
            </Button>
            <Button type="submit" form="form-operasi" disabled={simpan}>
              {simpan ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id="form-operasi" onSubmit={simpanJadwal} className="space-y-3">
          <FormField label="Pasien" petunjuk="Hanya pasien berstatus dirawat.">
            <select
              required
              value={form.pasienId}
              onChange={(e) => setForm({ ...form, pasienId: e.target.value })}
              className={gayaInput}
            >
              <option value="">Pilih pasien…</option>
              {pasienDirawat.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.noRm} · {p.nama} ({p.bangsal} {p.kamar})
                </option>
              ))}
            </select>
            {pasienDirawat.length === 0 && (
              <span className="mt-1 block text-xs text-amber-700">Belum ada pasien dirawat.</span>
            )}
          </FormField>

          <FormField label="Tindakan">
            <input
              required
              value={form.tindakan}
              onChange={(e) => setForm({ ...form, tindakan: e.target.value })}
              className={gayaInput}
              placeholder="Mis. Apendektomi"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Tanggal">
              <input
                type="date"
                required
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className={gayaInput}
              />
            </FormField>
            <FormField label="Jam">
              <input
                type="time"
                required
                value={form.jam}
                onChange={(e) => setForm({ ...form, jam: e.target.value })}
                className={gayaInput}
              />
            </FormField>
          </div>

          <FormField label="Dokter">
            <input
              value={form.dokter}
              onChange={(e) => setForm({ ...form, dokter: e.target.value })}
              className={gayaInput}
              placeholder="Nama dokter"
            />
          </FormField>

          <FormField label="Catatan">
            <textarea
              rows={2}
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              className={gayaInput}
            />
          </FormField>
        </form>
      </Modal>

      <JsonModal
        open={jsonBuka}
        onClose={() => setJsonBuka(false)}
        judul={`JSON event ${eventTerakhir?.jenis ?? ''}`}
        data={eventTerakhir}
      />
    </div>
  )
}
