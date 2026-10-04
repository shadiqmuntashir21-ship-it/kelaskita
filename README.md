# KelasKita

KelasKita adalah ruang kerja digital wali kelas berbahasa Indonesia. Pelanggan masuk menggunakan **kode lisensi + PIN**, sedangkan Mode Demo memakai data contoh lokal dan tidak menulis ke database pelanggan.

## Fitur V2
- Beranda harian wali kelas
- Kelola siswa + impor Excel
- Kehadiran harian
- Mata pelajaran (tambah/ubah/hapus)
- Penilaian: tugas harian, ulangan harian, tengah semester, akhir semester, lainnya
- Input nilai massal + remedial
- Bobot nilai dan semester aktif
- Jadwal pelajaran
- Catatan, prestasi, tindak lanjut, komunikasi orang tua, agenda
- Pusat Laporan Excel dan PDF
- PWA dengan identitas visual KelasKita
- Panel pemilik untuk lisensi pelanggan

## Stack
- Next.js App Router
- Neon PostgreSQL
- Vercel
- PWA

## Lingkungan
Salin `.env.example` menjadi `.env.local`, lalu isi `DATABASE_URL`, `SESSION_SECRET`, dan `OWNER_PASSWORD`.

## Database
Skema induk ada di `database/schema.sql`. Penambahan V2 juga tersedia terpisah di `database/schema-v2.sql`.

## Rilis
V2 production siap dengan modul akademik, jadwal, laporan Excel/PDF, dan identitas visual final KelasKita.
