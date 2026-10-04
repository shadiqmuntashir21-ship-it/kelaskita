# KelasKita

KelasKita adalah aplikasi wali kelas berbahasa Indonesia yang berfokus pada pekerjaan harian guru: siswa, kehadiran, catatan, prestasi, tindak lanjut, komunikasi orang tua, agenda, dan laporan.

## Stack
- Next.js App Router
- Neon PostgreSQL
- Vercel
- PWA

## Model akses
- Pelanggan masuk dengan **kode lisensi + PIN**.
- Setiap lisensi memiliki ruang data sendiri di tingkat server.
- **Mode Demo** menggunakan data dummy lokal dan tidak menulis ke database.
- Panel `/pemilik` digunakan untuk menerbitkan dan mengaktif/nonaktifkan lisensi.

## Lingkungan
Salin `.env.example` menjadi `.env.local`, lalu isi `DATABASE_URL`, `SESSION_SECRET`, dan `OWNER_PASSWORD`.

## Menjalankan
```bash
npm install
npm run dev
```

## Database
Skema ada di `database/schema.sql`.

## Status
Versi awal KelasKita siap untuk deployment production pertama.
