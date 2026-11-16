import toast from 'react-hot-toast'
import { Copy } from 'lucide-react'
import Modal from './ui/Modal.jsx'
import Button from './ui/Button.jsx'

export default function JsonModal({ open, onClose, judul = 'Lihat JSON', data }) {
  const teks = JSON.stringify(data, null, 2)

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks)
      toast.success('JSON disalin ke clipboard')
    } catch {
      toast.error('Gagal menyalin. Pilih teksnya secara manual.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      judul={judul}
      lebar="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={salin}>
            <Copy size={15} /> Salin JSON
          </Button>
          <Button onClick={onClose}>Tutup</Button>
        </>
      }
    >
      <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-emerald-200">
        {teks}
      </pre>
    </Modal>
  )
}
