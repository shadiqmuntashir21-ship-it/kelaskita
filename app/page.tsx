import Link from 'next/link';
import { ArrowRight, BellRing, BookOpenCheck, ClipboardCheck, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

export default function Landing(){
  return <main className="landing">
    <nav className="kk-container landing-nav">
      <Link href="/" className="brand"><span className="brand-mark">K</span>KelasKita</Link>
      <div style={{display:'flex',gap:10}}><Link className="btn btn-ghost" href="/demo">Coba Demo</Link><Link className="btn btn-dark" href="/masuk">Masuk</Link></div>
    </nav>
    <section className="kk-container hero">
      <div>
        <span className="pill"><Sparkles size={15}/> Dibuat khusus untuk wali kelas</span>
        <h1>Kelas lebih tertata. <span>Siswa lebih terpantau.</span></h1>
        <p>KelasKita membantu wali kelas mengelola kehadiran, catatan siswa, prestasi, tindak lanjut, komunikasi orang tua, agenda, dan laporan dalam satu ruang kerja yang tenang dan mudah dipakai.</p>
        <div className="hero-actions"><Link className="btn btn-primary" href="/demo">Coba Mode Demo <ArrowRight size={17}/></Link><Link className="btn btn-ghost" href="/masuk">Saya sudah punya lisensi</Link></div>
        <div className="hero-note">Tidak perlu akun untuk mencoba demo. Data demo tidak masuk ke database.</div>
      </div>
      <div className="preview-shell"><div className="preview-inner">
        <div className="mini-head"><div><small style={{color:'#7a849b'}}>Selamat pagi,</small><div className="mini-title">Ibu Rina 👋</div></div><div className="mini-avatar">IR</div></div>
        <div className="mini-stats"><div className="mini-stat"><small>Hadir</small><b>32</b></div><div className="mini-stat"><small>Izin/Sakit</small><b>3</b></div><div className="mini-stat"><small>Perhatian</small><b>3</b></div></div>
        <div className="attention-card"><b>Perlu perhatian hari ini</b>
          <div className="attention-item"><div style={{display:'flex',gap:10}}><span className="dot"/><div><b>Ahmad Fauzan</b><small style={{display:'block',color:'#788197'}}>3 kali alfa bulan ini</small></div></div><span className="badge badge-warn">Tindak lanjut</span></div>
          <div className="attention-item"><div style={{display:'flex',gap:10}}><span className="dot"/><div><b>Fadli Akbar</b><small style={{display:'block',color:'#788197'}}>Sering terlambat</small></div></div><span className="badge badge-info">Pantau</span></div>
        </div>
        <div className="attention-card"><b>Agenda berikutnya</b><p style={{margin:'10px 0 0',color:'#6f7890'}}>10.30 · Pengumpulan proyek desain</p></div>
      </div></div>
    </section>
    <section className="kk-container"><div className="feature-grid">
      <div className="feature-card"><ClipboardCheck/><h3>Kehadiran cepat</h3><p>Semua siswa otomatis Hadir. Guru cukup mengubah yang sakit, izin, alfa, atau terlambat.</p></div>
      <div className="feature-card"><UsersRound/><h3>Siswa 360°</h3><p>Lihat identitas, orang tua, catatan, prestasi, kehadiran, dan tindak lanjut dalam satu tempat.</p></div>
      <div className="feature-card"><BellRing/><h3>Perlu perhatian</h3><p>KelasKita membantu memunculkan hal penting agar tindak lanjut tidak terlupakan.</p></div>
      <div className="feature-card"><BookOpenCheck/><h3>Administrasi rapi</h3><p>Data harian tersusun otomatis untuk membantu rekap dan laporan wali kelas.</p></div>
      <div className="feature-card"><ShieldCheck/><h3>Lisensi pribadi</h3><p>Setiap wali kelas masuk menggunakan kode lisensi dan PIN yang diberikan.</p></div>
      <div className="feature-card"><Sparkles/><h3>Mode Demo</h3><p>Calon pengguna dapat mencoba pengalaman penuh tanpa mengubah data pelanggan nyata.</p></div>
    </div></section>
    <section className="kk-container price-band"><div className="price-card"><div><small style={{color:'#aeb8d2'}}>LISENSI KELASKITA</small><div className="price">Rp99.000 <small>/ lisensi</small></div><p style={{color:'#bac4dc',marginBottom:0}}>Ruang kerja digital yang dibuat khusus untuk membantu wali kelas.</p></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><Link className="btn btn-primary" href="/demo">Coba Demo</Link><Link className="btn" style={{background:'#fff',color:'#0d1b3e'}} href="/masuk">Aktifkan Lisensi</Link></div></div></section>
  </main>
}
