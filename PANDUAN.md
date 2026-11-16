# Panduan AdmisiRS

Panduan pemakaian aplikasi + daftar hal yang **belum dibuat** dan harus disiapkan di sisi lain
(ekstensi Chrome dan NutriSmart). Setup instalasi ada di [`README.md`](./README.md), setup
Firebase di [`firebase/SETUP.md`](./firebase/SETUP.md).

Isi:
1. [Masuk dan role](#1-masuk-dan-role)
2. [Alur pemakaian harian](#2-alur-pemakaian-harian)
3. [Membaca halaman Integrasi](#3-membaca-halaman-integrasi)
4. [Uji integrasi tanpa ekstensi](#4-uji-integrasi-tanpa-ekstensi)
5. [Reset data ke kondisi demo](#5-reset-data-ke-kondisi-demo)
6. [Yang belum dibuat: ekstensi Chrome](#6-yang-belum-dibuat-ekstensi-chrome)
7. [Yang harus diadjust di NutriSmart](#7-yang-harus-diadjust-di-nutrismart)
8. [Sisa keterbatasan di AdmisiRS](#8-sisa-keterbatasan-di-admisirs)
9. [Checklist uji akhir](#9-checklist-uji-akhir)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Masuk dan role

Jalankan `npm run dev`, buka <http://localhost:5173>.

| Akun | Password | Role | Bisa apa |
|---|---|---|---|
| `admin@admisi.id` | `admins123` | admin | semua, termasuk tambah/hapus kamar & isi data contoh |
| `petugas@admisi.id` | `petugas123` | petugas | pasien, kamar (lihat saja), operasi, integrasi |
| `tanpa-dokumen@admisi.id` | `tanpa123` | — | **harus ditolak** (sengaja tanpa dokumen `users/{uid}`) |

- Akun Auth tanpa dokumen `users/{uid}` otomatis logout + toast "Akun belum terdaftar".
- Sesi bertahan setelah refresh. Tombol **Keluar** ada di kanan atas.
- URL halaman di luar menu role akan dilempar ke `/dashboard`.

---

## 2. Alur pemakaian harian

### 2.1 Isi data contoh (sekali saja, admin)

**Integrasi → Isi data contoh.**

Membuat: 14 kamar (Melati/Mawar/VIP), 6 pasien RM001–RM018, 2 jadwal operasi (hari ini &
besok), dan `meta/counter.noRmTerakhir = 22`. Karena itu pasien baru selalu mulai dari **RM023**.

Idempoten: kalau koleksi `kamar` sudah berisi, tombol berhenti dengan pesan
"Data kamar sudah ada, data contoh dilewati." Untuk mengulang dari nol, lihat bagian 5.

### 2.2 Daftarkan pasien

**Pasien → Daftarkan Pasien.**

Isi nama, jenis kelamin, tanggal lahir, diagnosa, alergi (pisahkan koma), kamar **kosong**,
diet awal, dan centang "Perlu operasi" bila perlu (opsional).

Saat disimpan, satu transaksi Firestore:
1. menaikkan `meta/counter`,
2. membuat dokumen `pasien` dengan `noRm` baru,
3. menandai kamar `terisi`.

Gagal di tengah = tidak ada data setengah jadi. Setelah sukses:
- toast "Pasien RM0xx terdaftar. Data siap diteruskan."
- event `pasien.masuk` tercatat di log berstatus `menunggu`
- modal JSON terbuka, bisa **Salin JSON**

Alergi disimpan huruf kecil (`kacang, Debu` → `["kacang","debu"]`).

### 2.3 Ubah pasien / pindah kamar

**Pasien → Ubah** pada baris pasien `dirawat`.

Boleh ubah nama, jenis kelamin, tanggal lahir, diagnosa, alergi, diet awal, perlu operasi, dan
kamar. Kalau kamar diganti, dalam satu transaksi kamar lama jadi `kosong` dan kamar baru
`terisi`. Hasilnya event `pasien.diperbarui` berisi **data lengkap** (bukan selisih).

### 2.4 Pulangkan pasien

**Pasien → Pulangkan → konfirmasi.**

Status jadi `pulang`, `tglPulang` = hari ini (Asia/Jakarta), kamar jadi `kosong`, event
`pasien.pulang` dibuat. Pasien pulang tidak bisa dipulangkan dua kali.

### 2.5 Kamar (admin)

**Kamar** menampilkan kartu per bangsal: kosong/terisi + nama penghuni.

- Admin: **Tambah Kamar** (bangsal + nomor, selalu mulai `kosong`) dan **Hapus kamar**
  (hanya muncul untuk kamar kosong).
- Petugas: hanya melihat.

### 2.6 Jadwal operasi

**Jadwal Operasi → Jadwalkan Operasi.**

Pilih pasien `dirawat`, isi tindakan, tanggal, jam, dokter, catatan. Sekali simpan:
- jadwal dibuat,
- `pasien.perluOperasi = true` (badge "Perlu operasi" muncul di tabel pasien),
- event `operasi.dijadwalkan` tercatat.

Baris `terjadwal` punya aksi **Selesai** / **Batal**. Perubahan status tidak mengirim event.

### 2.7 Dashboard

Ringkasan: pasien dirawat, kamar kosong/terisi, operasi hari ini, event menunggu/gagal,
5 event terakhir, dan operasi terdekat. Angka dihitung dari data Firestore secara live.

---

## 3. Membaca halaman Integrasi

### 3.1 Status log

| Status | Arti |
|---|---|
| `menunggu` | Event keluar sudah dicatat, belum diambil/diteruskan ekstensi |
| `diterima` | Tujuan mengirim `ACK_BALIK` sukses, atau ditandai manual |
| `gagal` | Validasi gagal / pasien tidak ditemukan / ditolak tujuan — pesan menjelaskan sebabnya |
| `diabaikan` | Duplikat `eventId`; data tidak diubah |

Tombol per baris: **Lihat JSON** (semua baris), **Tandai diterima** (hanya keluar `menunggu`).
Filter: arah (keluar/masuk) dan status. Pencarian menyaring **seluruh** log, bukan hanya halaman
yang tampil.

### 3.2 Badge "Sinkron" di tabel Pasien

Diambil dari **log terbaru** untuk nomor RM tersebut:

| Badge | Dari status log |
|---|---|
| Menunggu | `menunggu` |
| Sinkron | `diterima` |
| Gagal | `gagal` |
| Diabaikan | `diabaikan` |

Catatan: karena memakai event terakhir, satu event uji yang gagal bisa membuat badge jadi
"Gagal" walau sinkronisasi sebelumnya sukses. Ini sesuai definisi plan.

---

## 4. Uji integrasi tanpa ekstensi

Semua ini cukup dari UI. Gunakan akun admin.

1. **Kirim contoh event keluar**
   Integrasi → pilih jenis → **Kirim contoh**. Event memakai pasien `dirawat` pertama
   (RM001). Log bertambah `menunggu`, modal JSON terbuka, **Salin JSON** untuk dokumentasi.

2. **Impor event masuk (diet)**
   Integrasi → tempel di kotak **Impor JSON** → **Proses sebagai event masuk**.
   Contoh siap pakai: tombol **Isi contoh diet**, atau tempel ini:

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

   Hasil: kolom "Diet saat ini" RM001 berubah, log masuk `diterima`.

3. **Duplikat** — proses JSON yang sama lagi → log `diabaikan`, diet tidak berubah.

4. **Payload salah** — ganti `versi` jadi `2`, atau `noRm` jadi `RM999`, atau `jenis` jadi
   `obat.diperbarui` → log `gagal`, pesan jelas, data tidak berubah.

5. **Lewat `postMessage`** (setara pesan ekstensi), dari Console browser:

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

   Aplikasi memproses dan membalas `ACK`. Pesan yang dikirim dari iframe/window lain
   diabaikan (`e.source !== window`).

6. **Belum login** — kirim event seperti di atas sebelum login. Event ditahan di
   `sessionStorage.antreanIntegrasi`, lalu diproses otomatis setelah login.

7. **ACK_BALIK / Tandai diterima** — tanpa ekstensi, klik **Tandai diterima**. Dengan
   ekstensi, kirim `ACK_BALIK` dari content script; log keluar berubah `diterima`/`gagal`.

---

## 5. Reset data ke kondisi demo

Tidak ada tombol reset di aplikasi (sengaja, supaya data produksi tidak terhapus tidak sengaja).

1. Firebase Console → Firestore Database.
2. Hapus **isi** koleksi: `kamar`, `pasien`, `jadwalOperasi`, `integrasiLog`.
3. Hapus dokumen `meta/counter` (atau ubah `noRmTerakhir` jadi `22`).
4. Login admin → Integrasi → **Isi data contoh**.

Jangan hapus koleksi `users` — akun akan kehilangan akses.

---

## 6. Yang belum dibuat: ekstensi Chrome

**Status: belum ada sama sekali di repo ini.** Tidak ada folder ekstensi, `manifest.json`,
content script, atau background worker. Yang sudah ada hanya sisi website: pemancar
`EVENT_KELUAR`, listener `EVENT_MASUK`/`ACK_BALIK`, pengiriman `ACK`, dan log.

Tanpa ekstensi, semua event keluar tetap `menunggu` — website **tidak** mengirim apa pun ke
NutriSmart secara langsung.

### 6.1 Yang perlu dibuat (Chrome Manifest V3)

Struktur minimal yang disarankan:

```
ekstensi/
  manifest.json
  background.js        # service worker: antrean + routing
  content-admisirs.js  # jalan di origin AdmisiRS
  content-nutrismart.js# jalan di origin NutriSmart
  popup.html / popup.js
  konfigurasi.js       # daftar tujuan (nama + URL)
```

`manifest.json` minimal butuh:
- `manifest_version: 3`
- `permissions`: `storage`, `tabs` (atau `activeTab`)
- `host_permissions`: origin AdmisiRS (`http://localhost:5173/*` dan domain produksi) serta
  origin NutriSmart
- `content_scripts` untuk kedua origin, `background.service_worker`
- `action.default_popup`

### 6.2 Alur yang harus diimplementasikan

Kedua content script bersifat simetris (kurir dua arah):

1. **Tangkap event keluar**
   `window.addEventListener('message')` di halaman → filter `channel === 'rs-integrasi'` dan
   `tipe === 'EVENT_KELUAR'` → simpan `{ event, asal, tabId, waktu }` ke `chrome.storage.local`.

2. **Popup**
   Daftar event tertunda + daftar tab tujuan (cari tab NutriSmart via `chrome.tabs.query`).
   Pengguna memilih tujuan → kirim event ke content script tab tujuan lewat
   `chrome.tabs.sendMessage(tabId, { tipe: 'KIRIM_EVENT', event })`.

3. **Kirim ke halaman tujuan**
   Content script tujuan menjalankan
   `window.postMessage({ channel:'rs-integrasi', tipe:'EVENT_MASUK', event }, location.origin)`.
   Ini lolos aturan `e.source === window` karena pesan masuk ke main world halaman.

4. **Teruskan ACK**
   Content script tujuan mendengar `ACK` dari halaman → kirim ke service worker →
   service worker meneruskan ke tab asal → content script asal menjalankan
   `window.postMessage({ channel:'rs-integrasi', tipe:'ACK_BALIK', eventId, mitra:'nutrismart', ok, pesan }, location.origin)`.
   AdmisiRS sudah menangani `ACK_BALIK` (log keluar jadi `diterima`/`gagal`).

5. **Dedupe & retry**
   Simpan `eventId` yang sudah diteruskan; jangan kirim dua kali. Tandai event terkirim, bukan
   dihapus, supaya riwayat popup tetap ada.

### 6.3 Jebakan yang harus dihindari

- `targetOrigin` jangan `*`; pakai `location.origin`.
- Service worker MV3 bisa tidur: semua state harus di `chrome.storage`, bukan variabel global.
- Jangan `eval`, jangan menyisipkan isi event sebagai HTML.
- Content script harus menunggu halaman selesai load (SPA: listener tetap aktif, route berubah
  tanpa reload).
- Kalau tab tujuan ditutup / belum login di NutriSmart, event jangan dihapus — biarkan
  `menunggu` dan beri pesan di popup.
- Ekstensi hanya kurir: **jangan** menulis ke Firestore/Supabase langsung.

### 6.4 Cara menguji setelah ekstensi jadi

1. Buka dua tab: AdmisiRS (login) dan NutriSmart (login).
2. Daftarkan pasien di AdmisiRS → buka popup ekstensi → pilih tab NutriSmart → kirim.
3. Pasien harus muncul di NutriSmart; log AdmisiRS berubah `diterima` bila `ACK_BALIK` aktif.
4. Di NutriSmart, setujui pengajuan diet → `diet.diperbarui` terkirim balik →
   halaman Pasien AdmisiRS menampilkan diet baru.

---

## 7. Yang harus diadjust di NutriSmart

NutriSmart adalah proyek terpisah (Supabase). Yang perlu disiapkan di sana:

| # | Pekerjaan | Detail |
|---|---|---|
| 1 | Migration baru `19_terima_integrasi.sql` | RPC `terima_event_integrasi(p_event jsonb)`, `security definer`, hanya role `admin`/`ahli_gizi` |
| 2 | Upsert pasien | `pasien.masuk` & `pasien.diperbarui` → upsert berdasarkan `no_rm`; jangan insert baru kalau sudah ada |
| 3 | Mapping nama → id | Cari `bangsal_id` dari **nama** bangsal (`Melati`, `Mawar`, `VIP`) dan `jenis_diet_id` dari **nama** diet. Harus persis, case-sensitive |
| 4 | Alergi | Simpan huruf kecil, array; AdmisiRS sudah mengirim `["kacang","udang"]` |
| 5 | Pasien pulang | `pasien.pulang` → `status = 'pulang'`; biarkan trigger yang sudah ada membatalkan pesanan `menunggu` |
| 6 | Dedupe | Tabel `integrasi_log` dengan `event_id` unik; tolak duplikat dengan ACK sukses "diabaikan" |
| 7 | Listener `postMessage` | Pola sama Bagian 6.4: filter `channel`, `source === window`, whitelist jenis, validasi, kirim `ACK` |
| 8 | Emit diet | Setelah RPC `setujui_pengajuan_diet` sukses, kirim `EVENT_KELUAR` jenis `diet.diperbarui` berisi `noRm`, `jenisDiet`, `berlakuSejak` |
| 9 | Envelope | `versi: 1`, `eventId: crypto.randomUUID()`, `sumber: 'nutrismart'`, `waktu` ISO 8601 `+07:00` |
| 10 | Nomor RM | Jangan membuat nomor RM sendiri; upsert berdasarkan `noRm` dari AdmisiRS (RM023 dst.) |
| 11 | `operasi.dijadwalkan` | Belum diatur di plan. Minimal catat ke `integrasi_log` dan balas ACK sukses, atau abaikan dengan ACK sukses + pesan "tidak diproses" |
| 12 | Keamanan | Jangan percaya `data` mentah: validasi tipe & field sebelum RPC; jangan jalankan isi event |

Detail kontrak: `implementation_plan.md` Bagian 6. Yang dikirim AdmisiRS selalu **data lengkap**
pada `pasien.diperbarui`, jadi upsert aman (tidak perlu logika diff).

---

## 8. Sisa keterbatasan di AdmisiRS

| Hal | Status |
|---|---|
| `pasien.perhatian` (badge "Asupan rendah") | **Belum diproses** (bonus T-19). Validator mengenalinya, tetapi `terapkanEventMasuk` membalas `gagal` "belum didukung" |
| Ekspor CSV / cetak gelang | Belum dibuat (bonus T-20) |
| Ubah tanggal/jam operasi setelah dijadwalkan | Belum ada; hanya status selesai/batal |
| Tombol reset data | Sengaja tidak ada; reset lewat Firebase Console |
| Validasi nomor kamar ganda | Belum ada; admin bisa membuat `101A` dua kali di bangsal yang sama |
| Batas baca | `pasien` dan `integrasiLog` dibaca maksimal 200 dokumen (kuota Spark); pencarian/filter di klien |
| Uji otomatis | Tidak ada. Semua lewat uji manual browser |
| Uji dua tab bersamaan | Tidak dijalankan; keunikan `noRm` dijamin transaksi Firestore |
| Tampilan HP | Sudah responsif (sidebar off-canvas, tabel scroll), tetapi belum diuji visual di perangkat |
| Tombol Salin JSON | Ada dan memakai Clipboard API; di browser headless belum terverifikasi karena butuh gesture asli |
| Password demo di dokumentasi | Sengaja untuk tugas kuliah; ganti sebelum dipakai di luar demo |

---

## 9. Checklist uji akhir

Tanpa ekstensi:

- [ ] Login admin & petugas; petugas tidak melihat tambah/hapus kamar
- [ ] Akun tanpa `users/{uid}` ditolak
- [ ] Seed jalan sekali; kamar tampil per bangsal
- [ ] Daftar pasien → RM023, kamar terisi, event `pasien.masuk` `menunggu`
- [ ] Ubah alergi & pindah kamar → kamar lama kosong, baru terisi, event lengkap
- [ ] Pulangkan → status `pulang`, kamar kosong, event `pasien.pulang`
- [ ] Jadwalkan operasi → `perluOperasi = true`, event `operasi.dijadwalkan`
- [ ] Impor diet → diet berubah, log `diterima`
- [ ] Impor ulang event yang sama → `diabaikan`
- [ ] `versi: 2` / `noRm` tak ada / jenis asing → `gagal`
- [ ] `EVENT_MASUK` via Console diproses + ACK; dari iframe diabaikan
- [ ] Event saat logout ditahan lalu diproses setelah login
- [ ] Pencarian tabel menembus seluruh halaman
- [ ] Dashboard cocok dengan data

Dengan ekstensi + NutriSmart (belum bisa dijalankan sekarang):

- [ ] Pasien baru muncul di NutriSmart dengan bangsal, alergi, diet awal yang sama
- [ ] Setujui diet di NutriSmart → diet AdmisiRS berubah
- [ ] Log keluar berubah `diterima` lewat `ACK_BALIK`
- [ ] Event duplikat tidak membuat data ganda di NutriSmart

---

## 10. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| "Akun belum terdaftar" | Dokumen `users/{uid}` tidak ada / ID tidak sama dengan UID Auth |
| "Missing or insufficient permissions" | Rules belum di-deploy atau akun tidak punya dokumen `users` |
| Semua event tetap `menunggu` | Belum ada ekstensi. Untuk demo: **Tandai diterima** atau uji lewat Impor JSON |
| Impor JSON ditolak | Baca pesan di log; biasanya `versi`, `noRm`, `jenisDiet`, atau format tanggal salah |
| Duplikat terus `diabaikan` | `eventId` dipakai ulang; buat UUID baru |
| Diet tidak berubah | `noRm` tidak ada di AdmisiRS, atau pasien sudah pulang (tetap boleh diubah, cek log) |
| Halaman blank | Buka Console browser; biasanya config `.env.local` kosong atau rules menolak baca |
| Seed bilang "sudah ada" | Koleksi `kamar` tidak kosong; reset sesuai bagian 5 |
| Nomor RM tidak mulai RM023 | `meta/counter.noRmTerakhir` bukan 22 (mis. setelah reset manual) |
