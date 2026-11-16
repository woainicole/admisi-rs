import { collection, doc, getDocs, limit, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { hariIni } from '../lib/format.js'

const KAMAR_SEED = {
  Melati: ['101A', '101B', '102A', '102B', '103A', '103B', '104A', '104B'],
  Mawar: ['201A', '201B', '202A', '202B'],
  VIP: ['301', '302'],
}

// Sama dengan data demo NutriSmart (Bagian 8 plan).
const PASIEN_SEED = [
  {
    noRm: 'RM001', nama: 'Andi Pratama', jenisKelamin: 'L', tglLahir: '1975-03-12',
    kamar: 'Melati-101A', alergi: [], dietAwal: 'Diet DM', diagnosa: 'Diabetes melitus', perluOperasi: true,
  },
  {
    noRm: 'RM002', nama: 'Budi Santoso', jenisKelamin: 'L', tglLahir: '1968-08-01',
    kamar: 'Melati-101B', alergi: [], dietAwal: 'Rendah Garam', diagnosa: 'Hipertensi', perluOperasi: false,
  },
  {
    noRm: 'RM004', nama: 'Dian Kusuma', jenisKelamin: 'P', tglLahir: '1994-01-22',
    kamar: 'Melati-102B', alergi: ['kacang'], dietAwal: 'Normal', diagnosa: 'Observasi', perluOperasi: true,
  },
  {
    noRm: 'RM006', nama: 'Fajar Rahman', jenisKelamin: 'L', tglLahir: '1989-11-05',
    kamar: 'Melati-103B', alergi: ['udang'], dietAwal: 'Normal', diagnosa: 'Observasi', perluOperasi: false,
  },
  {
    noRm: 'RM008', nama: 'Haris Munandar', jenisKelamin: 'L', tglLahir: '1982-06-17',
    kamar: 'Mawar-201B', alergi: ['kacang', 'udang'], dietAwal: 'Diet Lunak', diagnosa: 'Pasca operasi', perluOperasi: false,
  },
  {
    noRm: 'RM018', nama: 'Rizky Firmansyah', jenisKelamin: 'L', tglLahir: '2001-09-09',
    kamar: 'Melati-104A', alergi: [], dietAwal: 'Diet Cair', diagnosa: 'Gangguan menelan', perluOperasi: false,
  },
]

function besok() {
  const tanggal = new Date()
  tanggal.setDate(tanggal.getDate() + 1)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(tanggal)
}

/**
 * Isi data contoh (Bagian 8). Idempoten: berhenti kalau koleksi kamar sudah berisi.
 * Semua tulisan dalam satu batch supaya tidak ada data setengah jadi.
 */
export async function isiDataContoh(uid) {
  const cek = await getDocs(query(collection(db, 'kamar'), limit(1)))
  if (!cek.empty) return { dibuat: false, pesan: 'Data kamar sudah ada, data contoh dilewati.' }

  const batch = writeBatch(db)
  batch.set(doc(db, 'meta', 'counter'), { noRmTerakhir: 22 })

  // 1) Siapkan referensi kamar + pemetaan pasien -> kamar.
  const kamarRef = {}
  for (const [bangsal, daftar] of Object.entries(KAMAR_SEED)) {
    for (const nomor of daftar) {
      kamarRef[`${bangsal}-${nomor}`] = { ref: doc(collection(db, 'kamar')), bangsal, nomor }
    }
  }

  const pasienRef = PASIEN_SEED.map((p) => ({ ...p, ref: doc(collection(db, 'pasien')) }))

  // 2) Kamar: satu kali tulis per dokumen, status sudah benar sejak awal.
  for (const [kunci, kamar] of Object.entries(kamarRef)) {
    const penghuni = pasienRef.find((p) => p.kamar === kunci)
    batch.set(kamar.ref, {
      bangsal: kamar.bangsal,
      nomor: kamar.nomor,
      status: penghuni ? 'terisi' : 'kosong',
      pasienId: penghuni ? penghuni.ref.id : null,
    })
  }

  // 3) Pasien.
  for (const p of pasienRef) {
    const kamar = kamarRef[p.kamar]
    batch.set(p.ref, {
      noRm: p.noRm,
      nama: p.nama,
      jenisKelamin: p.jenisKelamin,
      tglLahir: p.tglLahir,
      diagnosa: p.diagnosa,
      alergi: p.alergi,
      bangsal: kamar.bangsal,
      kamar: kamar.nomor,
      kamarId: kamar.ref.id,
      dietAwal: p.dietAwal,
      dietSaatIni: null,
      perluOperasi: p.perluOperasi,
      status: 'dirawat',
      tglMasuk: hariIni(),
      tglPulang: null,
      dibuatOleh: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  // 4) Dua jadwal operasi (hari ini & besok).
  const operasi = [
    {
      pasien: pasienRef.find((p) => p.noRm === 'RM001'),
      tindakan: 'Debridemen luka kaki',
      tanggal: hariIni(),
      jam: '09:00',
      dokter: 'dr. Sari Wulandari, Sp.B',
      catatan: 'Puasa 6 jam sebelum tindakan.',
    },
    {
      pasien: pasienRef.find((p) => p.noRm === 'RM004'),
      tindakan: 'Apendektomi',
      tanggal: besok(),
      jam: '11:00',
      dokter: 'dr. Bambang Prasetyo, Sp.B',
      catatan: '',
    },
  ]

  for (const o of operasi) {
    batch.set(doc(collection(db, 'jadwalOperasi')), {
      pasienId: o.pasien.ref.id,
      noRm: o.pasien.noRm,
      namaPasien: o.pasien.nama,
      tindakan: o.tindakan,
      tanggal: o.tanggal,
      jam: o.jam,
      dokter: o.dokter,
      status: 'terjadwal',
      catatan: o.catatan,
      createdAt: serverTimestamp(),
    })
  }

  await batch.commit()
  return { dibuat: true, pesan: 'Data contoh berhasil diisi.' }
}
