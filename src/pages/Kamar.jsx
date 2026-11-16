import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { admin } from '../lib/roles.js'
import { BANGSAL } from '../lib/integrasi.js'
import { createKamar, deleteKamar, subscribeKamar } from '../services/kamarService.js'
import { subscribePasien } from '../services/pasienService.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import FormField, { gayaInput } from '../components/ui/FormField.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Spinner from '../components/ui/Spinner.jsx'

export default function Kamar() {
  const { role } = useAuth()
  const bolehKelola = admin(role)

  const [kamar, setKamar] = useState([])
  const [pasien, setPasien] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')
  const [formBuka, setFormBuka] = useState(false)
  const [form, setForm] = useState({ bangsal: BANGSAL[0], nomor: '' })
  const [simpan, setSimpan] = useState(false)
  const [hapus, setHapus] = useState(null)
  const [prosesHapus, setProsesHapus] = useState(false)

  useEffect(() => {
    const lepasKamar = subscribeKamar(
      (data) => {
        setKamar(data)
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
      lepasKamar()
      lepasPasien()
    }
  }, [])

  const namaPenghuni = useMemo(
    () => Object.fromEntries(pasien.map((p) => [p.id, p.nama])),
    [pasien],
  )

  const kelompok = BANGSAL.map((bangsal) => ({
    bangsal,
    daftar: kamar.filter((k) => k.bangsal === bangsal),
  }))

  async function simpanKamar(e) {
    e.preventDefault()
    setSimpan(true)
    try {
      await createKamar(form)
      toast.success(`Kamar ${form.bangsal} ${form.nomor.toUpperCase()} ditambahkan.`)
      setForm({ bangsal: form.bangsal, nomor: '' })
      setFormBuka(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSimpan(false)
    }
  }

  async function konfirmasiHapus() {
    setProsesHapus(true)
    try {
      await deleteKamar(hapus.id)
      toast.success('Kamar dihapus.')
      setHapus(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProsesHapus(false)
    }
  }

  return (
    <div>
      <PageHeader
        judul="Kamar"
        deskripsi="Status kamar per bangsal. Kamar terisi tidak bisa dihapus."
        aksi={
          bolehKelola && (
            <Button onClick={() => setFormBuka(true)}>
              <Plus size={16} /> Tambah Kamar
            </Button>
          )
        }
      />

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {memuat && <Spinner penuh />}

      {!memuat && kamar.length === 0 && (
        <EmptyState
          judul="Belum ada kamar"
          pesan={
            bolehKelola
              ? 'Tambahkan kamar, atau isi data contoh dari halaman Integrasi.'
              : 'Minta admin mengisi data kamar terlebih dahulu.'
          }
        />
      )}

      {!memuat && kamar.length > 0 && (
        <div className="space-y-5">
          {kelompok.map(({ bangsal, daftar }) => (
            <section key={bangsal} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Bangsal {bangsal}</h2>
                <span className="text-xs text-slate-500">
                  {daftar.filter((k) => k.status === 'terisi').length} terisi ·{' '}
                  {daftar.filter((k) => k.status === 'kosong').length} kosong
                </span>
              </div>

              {daftar.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada kamar di bangsal ini.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {daftar.map((k) => (
                    <div
                      key={k.id}
                      className={`rounded-lg border p-3 ${
                        k.status === 'terisi' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-800">
                            {k.bangsal} {k.nomor}
                          </p>
                          <p className="text-xs text-slate-500">
                            {k.status === 'terisi'
                              ? namaPenghuni[k.pasienId] || 'Penghuni tidak ditemukan'
                              : 'Kosong'}
                          </p>
                        </div>
                        <Badge warna={k.status === 'terisi' ? 'hijau' : 'abu'}>{k.status}</Badge>
                      </div>
                      {bolehKelola && k.status === 'kosong' && (
                        <button
                          onClick={() => setHapus(k)}
                          className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline"
                        >
                          <Trash2 size={13} /> Hapus kamar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal
        open={formBuka}
        onClose={() => setFormBuka(false)}
        judul="Tambah Kamar"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormBuka(false)} disabled={simpan}>
              Batal
            </Button>
            <Button type="submit" form="form-kamar" disabled={simpan}>
              {simpan ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id="form-kamar" onSubmit={simpanKamar} className="space-y-3">
          <FormField label="Bangsal">
            <select
              value={form.bangsal}
              onChange={(e) => setForm({ ...form, bangsal: e.target.value })}
              className={gayaInput}
            >
              {BANGSAL.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Nomor kamar" petunjuk="Contoh: 105A">
            <input
              required
              value={form.nomor}
              onChange={(e) => setForm({ ...form, nomor: e.target.value })}
              className={gayaInput}
              placeholder="105A"
            />
          </FormField>
          <p className="text-xs text-slate-500">Kamar baru selalu berstatus kosong.</p>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!hapus}
        judul="Hapus kamar"
        pesan={hapus ? `Hapus kamar ${hapus.bangsal} ${hapus.nomor}? Tindakan ini tidak bisa dibatalkan.` : ''}
        labelYa="Hapus"
        proses={prosesHapus}
        onYa={konfirmasiHapus}
        onTutup={() => setHapus(null)}
      />
    </div>
  )
}
