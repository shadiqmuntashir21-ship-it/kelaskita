# KelasKita

KelasKita adalah ruang kerja digital guru berbahasa Indonesia untuk wali kelas, guru mata pelajaran, atau keduanya. Pelanggan masuk menggunakan **kode lisensi + PIN**, sedangkan Mode Demo memakai data contoh lokal dan tidak menulis ke database pelanggan.

## Fitur Utama
- Beranda kerja guru dengan ruang kelas aktif
- Siswa 360°
- Kehadiran harian
- Mata pelajaran, penilaian, nilai massal, remedial, dan jadwal pelajaran
- Peringatan cerdas berbasis aturan
- Catatan rapor otomatis yang dapat diedit guru
- Administrasi kelas dan kelengkapan dokumen
- Surat & dokumen PDF otomatis
- Struktur kelas dan jadwal piket
- Tutup tahun ajaran, arsip, dan naik kelas
- Pusat Laporan Excel dan PDF
- Mode Demo terpisah dari data pelanggan
- Pembelian Rp99.000 dengan verifikasi pembayaran manual oleh pemilik
- Lisensi + PIN dikirim otomatis ke email setelah pembayaran dikonfirmasi
- Panel Pemilik: Pesanan, Lisensi, dan Pembayaran
- PWA dengan identitas visual KelasKita

## Stack
- Next.js App Router
- Neon PostgreSQL
- Vercel
- Resend
- PWA

## Lingkungan
Salin `.env.example` menjadi `.env.local`, lalu isi seluruh environment variable.

## Database
Skema induk ada di `database/schema.sql`. Snapshot V3 tersedia di `database/schema-v3.sql`.

<!-- V3 owner environment refresh 2 -->

## V4 — Onboarding, Impor Excel, dan Multi-Device Cloud
- Impor siswa Excel dengan preview, pemetaan kolom, validasi NISN/NIS/nama, dan strategi merge.
- Impor nilai Excel untuk semester yang sudah berjalan, termasuk pembuatan penilaian otomatis dan penanganan konflik nilai.
- Onboarding khusus pengguna yang sudah memiliki data sebelumnya.
- Multi-device cloud dengan batas awal 5 perangkat aktif per lisensi.
- Proteksi konflik edit untuk data inti saat dipakai dari beberapa perangkat.

<!-- release: smart-excel-reader-final-2026-10-05 -->


## V5 — Satu Lisensi untuk Satu Guru
- Satu lisensi dapat mengelola beberapa kelas dan mata pelajaran.
- Onboarding peran: Wali Kelas, Guru Mata Pelajaran, atau Keduanya.
- Data operasional terisolasi per kelas melalui `class_id` dan `class_enrollments`.
- Workspace switcher untuk berpindah kelas tanpa membuat akun baru.
- Smart Excel Reader multi-sheet untuk workbook kelas seperti 2A, 2B, 2C, 2D.
- Impor nilai formatif bulanan dan rekap nilai lintas kelas dalam satu workbook.
- Backup JSON dan reset data kelas dengan konfirmasi eksplisit tanpa menghapus lisensi.
- Tutup tahun ajaran per kelas; kelas lain pada lisensi yang sama tidak disentuh.
- Pembelian dan lisensi manual mengikuti model 1 lisensi = 1 guru; kelas ditentukan saat onboarding.
- Snapshot skema V5 tersedia di `database/schema-v5.sql`.
