# Setup Firebase (sekali saja)

Proyek ini memakai **paket Spark (gratis)**: Firestore + Authentication + Hosting (opsional).
Tidak ada Cloud Functions, Storage, atau Admin SDK.

> Catatan: untuk proyek `admisirs-app` langkah 1–6 sudah dikerjakan (project, Firestore `asia-southeast2`, Auth Email/Password,
> rules ter-deploy, 2 akun demo + dokumen `users`, web app + `.env.local`).
> Akun demo yang sudah ada: `admin@admisi.id` / `admins123` (role `admin`) dan `petugas@admisi.id` / `petugas123` (role `petugas`).
> Ada juga `tanpa-dokumen@admisi.id` / `tanpa123` yang **sengaja** tidak punya dokumen `users` — dipakai menguji skenario #2 (harus ditolak).
> Ganti password-nya di Console kalau perlu. Sisa dokumen ini tetap ditulis lengkap supaya orang lain bisa mengulang dari nol.

## 1. Buat project

1. Buka <https://console.firebase.google.com> → **Add project**.
2. Nama bebas (contoh: `admisirs-app`). Google Analytics boleh dimatikan.
3. Pastikan paket tetap **Spark**.

## 2. Aktifkan Cloud Firestore

1. Menu **Build → Firestore Database** → **Create database**.
2. Pilih mode **Native**, lokasi `asia-southeast2` (Jakarta).
3. Aturan awal jangan "test mode" — langsung tempel rules langkah 4.

## 3. Aktifkan Authentication

1. Menu **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → aktifkan **Email/Password**.
3. Tab **Users** → **Add user**, buat dua akun demo:
   - `admin@admisi.id` / mis. `admins123`
   - `petugas@admisi.id` / mis. `petugas123`
4. **Matikan pendaftaran mandiri** (kalau opsinya ada di project Anda), karena akun dibuat manual.

> Bootstrap dokumen `users` pertama kali (admin belum ada, tapi rules butuh admin):
> deploy rules sementara yang mengizinkan `create` pada `users/{uid}` bila `request.auth.uid == uid`,
> buat akun + dokumennya, lalu **kembalikan rules asli**. Jangan biarkan rules sementara itu aktif.

## 4. Pasang Security Rules

1. Menu **Firestore Database → Rules**.
2. Tempel seluruh isi [`firestore.rules`](./firestore.rules), lalu **Publish**.
3. Alternatif lewat CLI: `firebase deploy --only firestore:rules`.

Aturan ini butuh dokumen `users/{uid}`. Tanpa dokumen itu, akun Auth **tidak bisa membaca/menulis apa pun** — jadi langkah 5 wajib.

## 5. Buat dokumen `users/{uid}`

Untuk tiap akun di langkah 3:

1. Salin **UID** akun dari halaman Authentication → Users.
2. Buka **Firestore Database → Data**, buat koleksi `users`, dokumen dengan **ID = UID** tadi:

```
users/{uid}
  nama:   "Admin RS"          (string)
  role:   "admin"             ('admin' atau 'petugas')
```

Akun `petugas@admisi.id` → `role: "petugas"`, nama mis. "Petugas Admisi".

## 6. Daftarkan web app & ambil config

1. **Project settings (ikon gerigi) → General → Your apps** → tambah app **Web**.
2. Salin objek `firebaseConfig`.
3. Buat file `.env.local` di root proyek (salin dari `.env.example`) dan isi:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Config web Firebase **bukan rahasia** — keamanan data dijaga oleh Security Rules, bukan kerahasiaan key.
Jangan pernah menaruh service account key di repo ini.

## 7. Jalankan aplikasi

```bash
npm install
npm run dev
```

Login dengan akun langkah 3. Kalau muncul "Akun belum terdaftar", berarti langkah 5 terlewat
atau ID dokumen `users` tidak sama dengan UID.

## 8. (Opsional) Hosting

`firebase.json` sudah menyiapkan Hosting dengan rewrite SPA ke `index.html`.

```bash
npm run build
firebase deploy --only hosting
```
