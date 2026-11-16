import Modal from './Modal.jsx'
import Button from './Button.jsx'

export default function ConfirmDialog({ open, judul, pesan, labelYa = 'Ya', onYa, onTutup, proses = false }) {
  return (
    <Modal
      open={open}
      onClose={onTutup}
      judul={judul}
      footer={
        <>
          <Button variant="secondary" onClick={onTutup} disabled={proses}>
            Batal
          </Button>
          <Button variant="danger" onClick={onYa} disabled={proses}>
            {proses ? 'Memproses…' : labelYa}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{pesan}</p>
    </Modal>
  )
}
