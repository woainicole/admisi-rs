import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { BANGSAL, JENIS_DIET, dataPasienKeluar } from '../lib/integrasi.js'
import { subscribeKamar } from '../services/kamarService.js'
import {
  daftarkanPasien,
  pulangkanPasien,
  subscribePasien,
  ubahPasien,
} from '../services/pasienService.js'
import { kirimKeluar, subscribeLog } from '../services/integrasiService.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import FormField, { gayaInput } from '../components/ui/FormField.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import JsonModal from '../components/JsonModal.jsx'

const FORM_KOSONG = {
  nama: '',
  jenisKelamin: 'L',
  tglLahir: '',
  diagnosa: '',
  alergiTeks: '',
  kamarId: '',
  dietAwal: 'Normal',
  perluOperasi: false,
}

const BADGE_SINKRON = {
  menunggu: { warna: 'abu', label: 'Menunggu' },
  diterima: { warna: 'hijau', label: 'Sinkron' },
  gagal: { warna: 'merah', label: 'Gagal' },
  diabaikan: { warna: 'kuning', label: 'Diabaikan' },
}

function FormPasien({ form, setForm, kamar, kamarSekarang }) {
  const alergi = form.alergiTeks
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)

  return (
    <div className="space-y-3">
      <FormField label="Nama pasien">
        <input
          required
          value={form.nama}
          onChange={(e) => setForm({ ...form, nama: e.target.value })}
          className={gayaInput}
          placeholder="Nama lengkap"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Jenis kelamin">
          <select
            value={form.jenisKelamin}
            onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}
            className={gayaInput}
          >
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </FormField>
        <FormField label="Tanggal lahir">
          <input
            type="date"
            required
            value={form.tglLahir}
            onChange={(e) => setForm({ ...form, tglLahir: e.target.value })}
            className={gayaInput}
          />
        </FormField>
      </div>

      <FormField label="Diagnosa">
        <input
          value={form.diagnosa}
          onChange={(e) => setForm({ ...form, diagnosa: e.target.value })}
          className={gayaInput}
          placeholder="Mis. Diabetes melitus"
        />
      </FormField>

      <FormField label="Alergi" petunjuk="Pisahkan dengan koma. Disimpan huruf kecil, mis. kacang, udang">
        <input
          value={form.alergiTeks}
          onChange={(e) => setForm({ ...form, alergiTeks: e.target.value })}
          className={gayaInput}
          placeholder="kacang, udang"
        />
      </FormField>
      {alergi.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {alergi.map((a) => (
            <Badge key={a} warna="merah">
              {a}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Kamar">
          <select
            required
            value={form.kamarId}
            onChange={(e) => setForm({ ...form, kamarId: e.target.value })}
            className={gayaInput}
          >
            <option value="">Pilih kamar…</option>
            {kamarSekarang && (
              <option value={kamarSekarang.id}>
                {kamarSekarang.bangsal} {kamarSekarang.nomor} (sekarang)
              </option>
            )}
            {kamar
              .filter((k) => k.id !== kamarSekarang?.id)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.bangsal} {k.nomor}
                </option>
              ))}
          </select>
          {kamar.length === 0 && !kamarSekarang && (
            <span className="mt-1 block text-xs text-amber-700">Tidak ada kamar kosong.</span>
          )}
        </FormField>
        <FormField label="Diet awal">
          <select
            value={form.dietAwal}
            onChange={(e) => setForm({ ...form, dietAwal: e.target.value })}
            className={gayaInput}
          >
            {JENIS_DIET.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.perluOperasi}
          onChange={(e) => setForm({ ...form, perluOperasi: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300"
        />
        Perlu operasi
      </label>
    </div>
  )
}

export default function Pasien() {
  const { user } = useAuth()

  const [pasien, setPasien] = useState([])
  const [kamar, setKamar] = useState([])
  const [log, setLog] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')

  const [filterStatus, setFilterStatus] = useState('semua')
  const [filterBangsal, setFilterBangsal] = useState('semua')

  const [formBuka, setFormBuka] = useState(false)
  const [pasienEdit, setPasienEdit] = useState(null)
  const [form, setForm] = useState(FORM_KOSONG)
  const [simpan, setSimpan] = useState(false)

  const [pulang, setPulang] = useState(null)
  const [prosesPulang, setProsesPulang] = useState(false)

  const [eventTerakhir, setEventTerakhir] = useState(null)
  const [jsonBuka, setJsonBuka] = useState(false)
  const [jsonData, setJsonData] = useState(null)

  useEffect(() => {
    const lepasPasien = subscribePasien(
      (data) => {
        setPasien(data)
        setMemuat(false)
      },
      (e) => {
        setError(e.message)
        toast.error(e.message)
        setMemuat(false)
      },
    )
    const lepasKamar = subscribeKamar(
      (data) => setKamar(data),
      (e) => toast.error(e.message),
    )
    const lepasLog = subscribeLog(
      (data) => setLog(data),
      (e) => toast.error(e.message),
    )
    return () => {
      lepasPasien()
      lepasKamar()
      lepasLog()
    }
  }, [])

  // Badge status sinkron = status log terbaru untuk nomor RM tersebut.
  const sinkron = useMemo(() => {
    const peta = {}
    for (const item of log) {
      if (item.noRm && !peta[item.noRm]) peta[item.noRm] = item
    }
    return peta
  }, [log])

  const tampil = pasien.filter(
    (p) =>
      (filterStatus === 'semua' || p.status === filterStatus) &&
      (filterBangsal === 'semua' || p.bangsal === filterBangsal),
  )

  function bukaDaftar() {
    setPasienEdit(null)
    setForm(FORM_KOSONG)
    setFormBuka(true)
  }

  function bukaUbah(p) {
    setPasienEdit(p)
    setForm({
      nama: p.nama,
      jenisKelamin: p.jenisKelamin,
      tglLahir: p.tglLahir,
      diagnosa: p.diagnosa || '',
      alergiTeks: (p.alergi || []).join(', '),
      kamarId: p.kamarId ?? '',
      dietAwal: p.dietAwal,
      perluOperasi: !!p.perluOperasi,
    })
    setFormBuka(true)
  }

  function dataForm() {
    return {
      ...form,
      alergi: form.alergiTeks
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    }
  }

  async function simpanPasien(e) {
    e.preventDefault()
    setSimpan(true)
    try {
      if (pasienEdit) {
        const hasil = await ubahPasien(pasienEdit, dataForm(), user.uid)
        const event = await kirimKeluar('pasien.diperbarui', dataPasienKeluar(hasil), user.uid)
        setEventTerakhir(event)
        setJsonData(event)
        setJsonBuka(true)
        toast.success('Data siap diteruskan. Buka ekstensi browser untuk memilih tujuan.')
      } else {
        const baru = await daftarkanPasien(dataForm(), user.uid)
        const event = await kirimKeluar('pasien.masuk', dataPasienKeluar(baru), user.uid)
        setEventTerakhir(event)
        setJsonData(event)
        setJsonBuka(true)
        toast.success(`Pasien ${baru.noRm} terdaftar. Data siap diteruskan.`)
      }
      setFormBuka(false)
      setForm(FORM_KOSONG)
      setPasienEdit(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSimpan(false)
    }
  }

  async function konfirmasiPulang() {
    setProsesPulang(true)
    try {
      const hasil = await pulangkanPasien(pulang)
      await kirimKeluar('pasien.pulang', { noRm: hasil.noRm, tglPulang: hasil.tglPulang }, user.uid)
      toast.success(`Pasien ${hasil.noRm} dipulangkan. Data siap diteruskan.`)
      setPulang(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProsesPulang(false)
    }
  }

  const kamarKosong = kamar.filter((k) => k.status === 'kosong')
  const kamarSekarang = pasienEdit?.kamarId
    ? kamar.find((k) => k.id === pasienEdit.kamarId)
    : null

  const kolom = [
    { key: 'noRm', label: 'No. RM' },
    {
      key: 'nama',
      label: 'Nama',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-800">{p.nama}</p>
          <p className="text-xs text-slate-500">
            {p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
          </p>
        </div>
      ),
    },
    {
      key: 'kamar',
      label: 'Bangsal / Kamar',
      render: (p) => (p.status === 'pulang' ? <span className="text-slate-400">-</span> : `${p.bangsal ?? '-'} ${p.kamar ?? ''}`),
    },
    { key: 'diagnosa', label: 'Diagnosa', render: (p) => p.diagnosa || '-' },
    {
      key: 'alergi',
      label: 'Alergi',
      render: (p) =>
        p.alergi?.length ? (
          <div className="flex flex-wrap gap-1">
            {p.alergi.map((a) => (
              <Badge key={a} warna="merah">
                {a}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'dietSaatIni',
      label: 'Diet saat ini',
      render: (p) => p.dietSaatIni || <span className="text-slate-400">-</span>,
    },
    {
      key: 'perluOperasi',
      label: 'Operasi',
      render: (p) => (p.perluOperasi ? <Badge warna="kuning">Perlu operasi</Badge> : <span className="text-slate-400">-</span>),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <Badge warna={p.status === 'dirawat' ? 'biru' : 'abu'}>{p.status}</Badge>,
    },
    {
      key: 'sinkron',
      label: 'Sinkron',
      render: (p) => {
        const status = sinkron[p.noRm]?.status
        const badge = BADGE_SINKRON[status]
        return badge ? <Badge warna={badge.warna}>{badge.label}</Badge> : <span className="text-slate-400">-</span>
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (p) =>
        p.status === 'dirawat' ? (
          <div className="flex gap-2 whitespace-nowrap">
            <button onClick={() => bukaUbah(p)} className="flex items-center gap-1 text-xs text-emerald-700 hover:underline">
              <Pencil size={13} /> Ubah
            </button>
            <button onClick={() => setPulang(p)} className="text-xs text-red-600 hover:underline">
              Pulangkan
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">{p.tglPulang ?? '-'}</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        judul="Pasien"
        deskripsi="Data pasien rawat inap dan status sinkronisasi ke NutriSmart."
        aksi={
          <Button onClick={bukaDaftar}>
            <UserPlus size={16} /> Daftarkan Pasien
          </Button>
        }
      />

      {eventTerakhir && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Event terakhir: <b>{eventTerakhir.jenis}</b> · {eventTerakhir.data?.noRm}
          <Button variant="secondary" onClick={() => { setJsonData(eventTerakhir); setJsonBuka(true) }}>
            Lihat JSON
          </Button>
        </div>
      )}

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-3 flex flex-wrap gap-2">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={gayaInput + ' max-w-[180px]'}>
          <option value="semua">Semua status</option>
          <option value="dirawat">Dirawat</option>
          <option value="pulang">Pulang</option>
        </select>
        <select value={filterBangsal} onChange={(e) => setFilterBangsal(e.target.value)} className={gayaInput + ' max-w-[180px]'}>
          <option value="semua">Semua bangsal</option>
          {BANGSAL.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {memuat ? (
        <Spinner penuh />
      ) : (
        <DataTable
          kolom={kolom}
          data={tampil}
          cariFields={['noRm', 'nama', 'diagnosa', 'kamar', 'bangsal']}
          placeholderCari="Cari nama, no. RM, diagnosa, kamar…"
          kosong={
            <EmptyState
              judul={pasien.length === 0 ? 'Belum ada pasien' : 'Tidak ada pasien yang cocok'}
              pesan={
                pasien.length === 0
                  ? 'Klik "Daftarkan Pasien" atau isi data contoh dari halaman Integrasi.'
                  : 'Ubah kata kunci atau filter.'
              }
            />
          }
        />
      )}

      <Modal
        open={formBuka}
        onClose={() => setFormBuka(false)}
        judul={pasienEdit ? `Ubah Pasien ${pasienEdit.noRm}` : 'Daftarkan Pasien'}
        lebar="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormBuka(false)} disabled={simpan}>
              Batal
            </Button>
            <Button type="submit" form="form-pasien" disabled={simpan}>
              {simpan ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id="form-pasien" onSubmit={simpanPasien}>
          <FormPasien form={form} setForm={setForm} kamar={kamarKosong} kamarSekarang={kamarSekarang} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pulang}
        judul="Pulangkan pasien"
        pesan={pulang ? `Pulangkan ${pulang.nama} (${pulang.noRm})? Kamar ${pulang.bangsal} ${pulang.kamar} akan menjadi kosong.` : ''}
        labelYa="Pulangkan"
        proses={prosesPulang}
        onYa={konfirmasiPulang}
        onTutup={() => setPulang(null)}
      />

      <JsonModal
        open={jsonBuka}
        onClose={() => setJsonBuka(false)}
        judul={`JSON event ${jsonData?.jenis ?? ''}`}
        data={jsonData}
      />
    </div>
  )
}
