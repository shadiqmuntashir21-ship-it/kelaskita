# KelasKita

KelasKita adalah ruang kerja digital wali kelas berbahasa Indonesia. Pelanggan masuk menggunakan **kode lisensi + PIN**, sedangkan Mode Demo memakai data contoh lokal dan tidak menulis ke database pelanggan.

## Fitur V3
- Beranda harian wali kelas
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

## Rilis Production
KelasKita V3: administrasi wali kelas, laporan, dan penjualan lisensi.
