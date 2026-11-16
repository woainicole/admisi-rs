# AdmisiRS

Sistem admisi & rawat inap sederhana. Vite + React 18 + Tailwind v4 + Firebase
(Firestore + Auth). Fokus tugas: **pertukaran event dengan NutriSmart** lewat ekstensi
browser memakai kontrak integrasi v1 (`implementation_plan.md` Bagian 6).

Panduan pemakaian dan daftar pekerjaan yang belum dibuat (ekstensi Chrome & sisi
NutriSmart) ada di [`PANDUAN.md`](./PANDUAN.md).

## Fitur

- Login role `admin` / `petugas` (dokumen `users/{uid}` wajib ada).
- Dashboard: pasien dirawat, kamar kosong/terisi, operasi hari ini, event menunggu/gagal.
- Pasien: daftar, ubah (termasuk pindah kamar), pulangkan; tiap aksi mengirim event keluar.
- Kamar: status per bangsal; admin bisa tambah/hapus kamar kosong.
- Jadwal operasi: buat jadwal + ubah status selesai/batal.
- Integrasi: log event, simulator event keluar, impor JSON event masuk, panel kontrak.

## Prasyarat

- Node.js 20+
- Project Firebase paket **Spark** (gratis): Firestore + Authentication + Hosting opsional.

## Setup

```bash
npm install
```

1. Ikuti [`firebase/SETUP.md`](./firebase/SETUP.md): buat project, aktifkan Firestore
   (`asia-southeast2`), aktifkan **Auth Email/Password**, deploy
   [`firebase/firestore.rules`](./firebase/firestore.rules), buat dokumen `users/{uid}`,
   dan daftarkan web app.
2. Salin `.env.example` menjadi `.env.local`, isi config web Firebase (`VITE_FIREBASE_*`).
3. Jalankan:

```bash
npm run dev
```

Buka <http://localhost:5173>.

### Akun demo (project contoh)

| Email | Password | Role |
|---|---|---|
| `admin@admisi.id` | `admins123` | admin |
| `petugas@admisi.id` | `petugas123` | petugas |
| `tanpa-dokumen@admisi.id` | `tanpa123` | — (sengaja tanpa `users/{uid}`, harus ditolak) |

Aturan Firestore menolak akun Auth yang tidak punya dokumen `users/{uid}`.

## Mulai dari database kosong

Login sebagai admin → menu **Integrasi** → tombol **Isi data contoh**.
Aksi ini idempoten (berhenti kalau koleksi `kamar` sudah berisi) dan membuat:

- 14 kamar (Melati, Mawar, VIP)
- 6 pasien RM001–RM018 (data sama dengan demo NutriSmart)
- 2 jadwal operasi (hari ini & besok)
- `meta/counter.noRmTerakhir = 22`, sehingga pasien baru menjadi **RM023**

## Menguji integrasi tanpa ekstensi

Semua langkah bisa dilakukan di UI, tanpa memasang ekstensi.

1. **Event keluar**: Pasien → Daftarkan/Ubah/Pulangkan. Log `integrasiLog/{eventId}`
   dibuat berstatus `menunggu`, toast muncul, dan tombol **Lihat JSON** menampilkan envelope.
2. **Simulator**: Integrasi → pilih jenis event → **Kirim contoh** → **Salin JSON**.
3. **Event masuk**: Integrasi → tempel envelope di kotak **Impor JSON** → **Proses sebagai
   event masuk**. Contoh diet untuk RM001:

```json
{
  "versi": 1,
  "eventId": "4f1c2b7a-0000-4000-8000-000000000001",
  "jenis": "diet.diperbarui",
  "sumber": "nutrismart",
  "waktu": "2026-11-16T09:00:00+07:00",
  "data": { "noRm": "RM001", "jenisDiet": "Diet Cair", "berlakuSejak": "2026-11-16" }
}
```

   Hasil: `pasien.dietSaatIni` berubah, log masuk `diterima`.
4. **Duplikat**: proses JSON yang sama sekali lagi → log `diabaikan`, data tidak berubah.
5. **Payload salah** (`versi: 2`, `noRm` tidak ada, jenis asing) → log `gagal` dengan pesan jelas.
6. **Lewat `postMessage`** (setara pesan ekstensi). Buka Console browser:

```js
window.postMessage({
  channel: 'rs-integrasi',
  tipe: 'EVENT_MASUK',
  event: {
    versi: 1,
    eventId: crypto.randomUUID(),
    jenis: 'diet.diperbarui',
    sumber: 'nutrismart',
    waktu: '2026-11-16T09:00:00+07:00',
    data: { noRm: 'RM002', jenisDiet: 'Diet Lunak', berlakuSejak: '2026-11-16' },
  },
}, location.origin)
```

   Pesan dari window lain (frame/iframe) diabaikan. Website membalas `ACK`.
7. **ACK_BALIK**: ekstensi dapat menandai log keluar `diterima`/`gagal`. Tanpa ekstensi,
   gunakan tombol **Tandai diterima** pada baris log berstatus `menunggu`.
8. **Belum login**: kirim event di atas sebelum login → event ditahan di `sessionStorage`,
   lalu diproses otomatis setelah login.

## Kontrak integrasi (ringkas)

- Channel `rs-integrasi`; pesan: `EVENT_KELUAR`, `EVENT_MASUK`, `ACK`, `ACK_BALIK`.
- Envelope: `versi: 1`, `eventId` (UUID), `jenis`, `sumber` (`admisirs`/`nutrismart`),
  `waktu` ISO 8601 `+07:00`, `data`.
- Keluar: `pasien.masuk`, `pasien.diperbarui`, `pasien.pulang`, `operasi.dijadwalkan`.
- Masuk: `diet.diperbarui` (diterapkan), `pasien.perhatian` (dikenal, belum diproses).
- ID dokumen log = `eventId`, sehingga duplikat terdeteksi otomatis.
- Kosakata bangsal: `Melati`, `Mawar`, `VIP`; diet: `Normal`, `Diet DM`, `Rendah Garam`,
  `Diet Lunak`, `Diet Cair`.

Detail lengkap ada di `implementation_plan.md` Bagian 6 dan panel kontrak di halaman Integrasi.

## Struktur folder

```
src/
  components/     UI dasar, layout, JsonModal
  context/        AuthContext, IntegrasiContext (listener postMessage + antrean)
  lib/            firebase.js, format.js, roles.js, integrasi.js (kontrak murni)
  pages/          Login, Dashboard, Pasien, Kamar, Operasi, Integrasi
  services/       semua akses Firestore (pasien, kamar, operasi, integrasi, seed)
firebase/         firestore.rules + SETUP.md
```

## Build & deploy (opsional)

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` sudah memakai rewrite SPA (`**` → `/index.html`) dan folder `dist`.

## Batasan yang disengaja

- Paket Spark: tanpa Cloud Functions, Storage, atau Admin SDK.
- List pasien & log dibaca maksimal 200 dokumen; pencarian/filter dilakukan di klien.
- Tanggal bisnis disimpan `YYYY-MM-DD` zona Asia/Jakarta; waktu sistem pakai `serverTimestamp()`.
