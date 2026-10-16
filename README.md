# MinjaPhotobooth — Aplikasi Photobooth Mandiri Windows

Selamat datang di repositori resmi **MinjaPhotobooth**, sebuah solusi sistem photobooth mandiri (*self-service*) modern yang dirancang untuk platform Windows 10/11 64-bit dengan antarmuka layar sentuh (*touchscreen*).

---

## 📌 Ringkasan Proyek

MinjaPhotobooth dibangun menggunakan tumpukan teknologi modern:
- **Frontend UI:** React 18, TypeScript, Vite, CSS modern yang dioptimalkan untuk layar sentuh landscape.
- **Desktop Runtime & Backend:** Electron, Node.js dengan jembatan IPC yang bertipe ketat (*strictly typed*).
- **Penyimpanan Ganda (Offline-First):** SQLite lokal untuk operasional tanpa jeda & antrean sinkronisasi asinkron ke PostgreSQL online.
- **Integrasi Pembayaran:** QRIS dinamis via Midtrans Snap API dengan verifikasi idempoten.
- **Kamera Modular:** Antarmuka adapter kamera yang mendukung Webcam USB, Virtual Webcam, dan DSLR (target awal: **Canon EOS 600D**).
- **Editor & Rendering:** Manipulasi foto (frame, filter, sticker) dan komposit resolusi tinggi 4R (1200x1800 px pada 300 DPI).
- **Cetak 4R:** Integrasi langsung dengan Windows Print Spooler.
- **Distribusi Digital:** Galeri privat dengan QR code dinamis serta pengiriman otomatis melalui Meta WhatsApp Cloud API resmi.
- **Admin Panel Tersembunyi:** Panel pengelolaan aman dengan autentikasi PIN ter-hash (Argon2id) dan laporan transaksi ekspor CSV.

---

## 📂 Struktur Dokumentasi Proyek

Sebelum mulai menulis kode, proyek ini dipandu oleh tiga dokumen spesifikasi utama:

1. [docs/PRD.md](docs/PRD.md) — *Product Requirements Document*: Menjelaskan kebutuhan bisnis, alur pelanggan (*customer journey*), dan persyaratan fungsional/nonfungsional.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — *Software Architecture Document*: Arsitektur sistem heksagonal, pola adapter perangkat keras, alur penyimpanan data *offline-first*, dan arsitektur keamanan.
3. [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — *API & IPC Contract Specification*: Definisi tipe data TypeScript, saluran komunikasi IPC Electron (`window.electronAPI`), dan kontrak webhook Midtrans.

---

## 🛠️ Prasyarat Perangkat & Sistem

Sebelum melangkah ke implementasi kode pada Milestone berikutnya, pastikan perangkat Windows Anda telah terpasang:
1. **Sistem Operasi:** Windows 10 atau 11 (64-bit).
2. **Node.js:** Versi LTS (Node.js v20.x atau v22.x direkomendasikan).  
   *Unduh di:* [https://nodejs.org](https://nodejs.org)
3. **Git for Windows:** Versi 2.40+.  
   *Unduh di:* [https://git-scm.com](https://git-scm.com)
4. **Visual Studio Code / Antigravity IDE** dengan ekstensi ESLint dan Prettier.
5. **Perangkat Keras Pendukung (Diuji bertahap):**
   - Layar sentuh (*touchscreen*) atau monitor standar + mouse untuk simulasi awal.
   - Webcam internal/USB atau Canon EOS 600D dengan kabel USB.
   - Printer foto 4R yang terpasang di driver Windows.

---

## 🗺️ Roadmap Pengerjaan Bertahap

Pengerjaan dilakukan secara bertahap satu demi satu milestone sesuai aturan workflow:
**Inspect ➔ Plan ➔ Implement ➔ Test ➔ Review ➔ Document ➔ Commit**

| Status | Milestone | Deskripsi |
|:---:|---|---|
| ✅ **SELESAI** | **Milestone 0: Baseline & Dokumen** | PRD, Arsitektur, Kontrak API/IPC, Git Repository, dan README panduan. |
| ⏳ **BERIKUTNYA** | **Milestone 1: Scaffolding Proyek** | Inisialisasi Electron + Vite + React + TypeScript, SQLite lokal, dan Typed IPC bridge dasar. |
| 📋 *Rencana* | **Milestone 2: Touch UI & State Machine** | Alur antarmuka pelanggan (Idle, Pilih Paket, Virtual Keyboard, State Machine). |
| 📋 *Rencana* | **Milestone 3: Pembayaran QRIS Midtrans** | Adapter Midtrans QRIS, webhook lokal, polling status, proteksi idempoten. |
| 📋 *Rencana* | **Milestone 4: Pipeline Kamera** | Adapter Webcam, Virtual Webcam, dan Canon EOS 600D, live preview, shutter capture. |
| 📋 *Rencana* | **Milestone 5: Editor Foto & Renderer 4R** | Editor frame/filter, sticker, dan rendering resolusi tinggi 300 DPI (1200x1800 px). |
| 📋 *Rencana* | **Milestone 6: Percetakan 4R Windows** | Windows Print Spooler adapter, antrean cetak lokal, penanganan error kertas. |
| 📋 *Rencana* | **Milestone 7: Distribusi Digital** | QR Galeri privat berbatas waktu dan pengiriman otomatis WhatsApp Cloud API. |
| 📋 *Rencana* | **Milestone 8: Admin Panel & Keamanan** | Login PIN ter-hash Argon2id, CRUD tarif/branding, analitik, dan ekspor CSV. |
| 📋 *Rencana* | **Milestone 9: Pengujian & Installer** | Windows packaging (.exe installer), auto-update, dan uji ketahanan aplikasi. |

---

## 🔍 Cara Menguji Tahap Ini (Milestone 0)

Untuk memastikan tahap dasar (*baseline*) telah selesai dengan benar:
1. Pastikan folder `docs/` berisi:
   - `docs/PRD.md`
   - `docs/ARCHITECTURE.md`
   - `docs/API_CONTRACT.md`
2. Pastikan file `.gitignore` dan `README.md` sudah berada di direktori utama (*root*).
3. Buka terminal Anda (PowerShell atau Git Bash) dan jalankan:
   ```powershell
   git status
   ```
   Pastikan seluruh dokumen terlacak dengan benar.

---

## ❓ Panduan Pemecahan Masalah (Troubleshooting)

### 1. `node : The term 'node' is not recognized...`
- **Penyebab:** Node.js belum terpasang atau path `C:\Program Files\nodejs` belum terdaftar pada *Environment Variables* Windows (PATH).
- **Solusi:**
  1. Unduh installer Node.js LTS dari situs resmi [nodejs.org](https://nodejs.org).
  2. Jalankan file `.msi` dan pastikan centang opsi *"Add to PATH"* aktif saat instalasi.
  3. Tutup dan buka kembali jendela terminal/IDE Anda agar perubahan PATH terbaca.

### 2. `git : The term 'git' is not recognized...`
- **Penyebab:** Git belum terpasang di sistem Windows Anda.
- **Solusi:** Unduh dan pasang Git for Windows dari [git-scm.com](https://git-scm.com).

### 3. File `.env` tidak sengaja ter-commit ke Git
- **Pencegahan:** File `.gitignore` sudah dikonfigurasi untuk mencegah file rahasia terunggah. Jangan pernah menggunakan `git add -f .env`.
