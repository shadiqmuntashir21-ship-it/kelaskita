import Link from 'next/link';
import {ArrowRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileSpreadsheet, FileText, ShieldCheck, Sparkles, TrendingUp, UsersRound} from 'lucide-react';
import Brand from '@/components/Brand';

const features=[
  [ClipboardCheck,'Kehadiran yang benar-benar praktis','Absensi harian, pola keterlambatan, alfa, rekap bulanan dan semester dalam satu alur.'],
  [BookOpen,'Akademik lengkap','Mata pelajaran, tugas harian, UH, PTS, PAS, remedial, batas ketuntasan, dan rekap siswa.'],
  [UsersRound,'Siswa 360°','Kehadiran, akademik, catatan, prestasi, tindak lanjut, dan identitas siswa dalam satu profil.'],
  [FileText,'Administrasi kelas','Catatan rapor, struktur kelas, jadwal piket, kelengkapan administrasi, surat, dan arsip tahun ajaran.'],
  [FileSpreadsheet,'Laporan siap pakai','Rekap Excel dan PDF disusun agar guru tidak perlu merapikan ulang data yang sama.'],
  [ShieldCheck,'Satu lisensi, ruang kerja terpisah','Satu guru dapat mengelola beberapa kelas dan mata pelajaran dengan data tiap kelas tetap terpisah.']
] as const;

export default function Landing(){return <main className="landing landing-v4">
  <nav className="kk-container landing-nav landing-nav-v4">
    <Brand/>
    <div className="landing-nav-actions">
      <Link className="btn btn-ghost" href="/demo">Lihat Demo Lengkap</Link>
      <Link className="btn btn-ghost" href="/masuk">Masuk</Link>
      <Link className="btn btn-dark" href="/beli">Beli KelasKita</Link>
    </div>
  </nav>

  <section className="kk-container lp-hero">
    <div className="lp-hero-copy">
      <span className="lp-kicker"><Sparkles size={14}/> Ruang kerja digital untuk guru</span>
      <h1>Satu tempat untuk mengelola kelas dan pembelajaran dengan <span>lebih tenang.</span></h1>
      <p>KelasKita membantu wali kelas dan guru mata pelajaran mengelola siswa, kehadiran, nilai, remedial, catatan, administrasi, dan laporan dalam satu ruang kerja.</p>
      <div className="lp-actions">
        <Link className="btn btn-primary lp-primary" href="/beli">Beli KelasKita Rp99.000 <ArrowRight size={18}/></Link>
        <Link className="btn btn-ghost" href="/demo">Coba Demo 12 Bulan</Link>
      </div>
      <div className="lp-trust">
        <span><CheckCircle2 size={15}/> Sekali bayar</span>
        <span><CheckCircle2 size={15}/> 1 lisensi = 1 guru</span>
        <span><CheckCircle2 size={15}/> Excel & PDF</span>
        <span><CheckCircle2 size={15}/> PWA siap dipasang</span>
      </div>
    </div>

    <div className="lp-product">
      <div className="lp-browser">
        <div className="lp-browser-bar"><span/><span/><span/><div>kelaskita.app</div></div>
        <div className="lp-browser-body">
          <div className="lp-demo-head"><div><small>Senin, 5 Oktober 2026</small><h3>Selamat pagi, Ibu Rina</h3><p>XI DKV 1 · 30 siswa aktif</p></div><img src="/brand/kelaskita-mark.png" alt=""/></div>
          <div className="lp-mini-grid">
            <Metric label="Kehadiran bulan ini" value="95,8%"/>
            <Metric label="Rata-rata akademik" value="84,6"/>
            <Metric label="Administrasi lengkap" value="92%"/>
          </div>
          <div className="lp-demo-grid">
            <div className="lp-demo-card">
              <div className="lp-card-title"><span>Peringatan cerdas</span><b>4</b></div>
              <DemoRow name="Ahmad Fauzan" note="3 alfa · 2 mapel perlu perhatian" state="Tinjau"/>
              <DemoRow name="Fadli Akbar" note="5 kali terlambat semester ini" state="Hari ini"/>
              <DemoRow name="Raka Pradana" note="Tindak lanjut melewati target" state="Tinjau"/>
            </div>
            <div className="lp-demo-card">
              <div className="lp-card-title"><span>Tren 6 bulan</span><TrendingUp size={17}/></div>
              <div className="lp-bars">{[72,78,76,84,88,92].map((x,i)=><i key={i} style={{height:`${x}%`}}/> )}</div>
              <div className="lp-bar-labels"><span>Mei</span><span>Jun</span><span>Jul</span><span>Agu</span><span>Sep</span><span>Okt</span></div>
            </div>
          </div>
          <div className="lp-demo-footer"><span>Data contoh 12 bulan penggunaan</span><b>30 siswa · 9 mapel · 162 penilaian</b></div>
        </div>
      </div>
      <div className="lp-float lp-float-a"><b>30</b><span>Siswa aktif</span></div>
      <div className="lp-float lp-float-b"><b>12 bln</b><span>Riwayat demo</span></div>
    </div>
  </section>

  <section className="kk-container lp-proof">
    <div><b>30</b><span>siswa dalam demo</span></div>
    <div><b>12 bulan</b><span>riwayat contoh</span></div>
    <div><b>Multi-kelas</b><span>untuk satu guru</span></div>
    <div><b>160+</b><span>penilaian tersimpan</span></div>
    <div><b>20+</b><span>jenis laporan & rekap</span></div>
  </section>

  <section className="kk-container lp-section lp-role-section">
    <div className="lp-section-head"><span className="lp-kicker">SATU APLIKASI, DUA CARA KERJA</span><h2>KelasKita mengikuti peran guru.</h2><p>Tidak semua guru bekerja dengan alur yang sama. Karena itu menu dan ruang kerja menyesuaikan peran yang dipilih.</p></div>
    <div className="lp-role-grid">
      <article className="lp-role-card"><span><UsersRound size={23}/></span><div><small>UNTUK WALI KELAS</small><h3>Kelola satu kelas secara menyeluruh.</h3><p>Siswa, kehadiran, akademik, catatan, prestasi, tindak lanjut, administrasi kelas, catatan rapor, dan laporan.</p></div></article>
      <article className="lp-role-card"><span><BookOpen size={23}/></span><div><small>UNTUK GURU MATA PELAJARAN</small><h3>Kelola satu mapel di beberapa kelas.</h3><p>Buat penilaian, impor nilai Excel lintas kelas, pantau ketuntasan dan remedial, lalu bandingkan progres setiap kelas.</p></div></article>
    </div>
    <div className="lp-role-note"><CheckCircle2 size={17}/><span>Guru yang menjadi wali kelas sekaligus mengajar mata pelajaran dapat menggunakan <b>keduanya dalam satu akun.</b></span></div>
  </section>

  <section className="kk-container lp-section">
    <div className="lp-section-head"><span className="lp-kicker">DIBUAT UNTUK PEKERJAAN NYATA</span><h2>Bukan sekadar dashboard. Ini ruang kerja guru.</h2><p>Gunakan sebagai wali kelas, guru mata pelajaran, atau keduanya dalam satu lisensi.</p></div>
    <div className="lp-feature-grid">{features.map(([I,t,d])=><article className="lp-feature" key={t}><span><I size={21}/></span><h3>{t}</h3><p>{d}</p></article>)}</div>
  </section>

  <section className="lp-showcase">
    <div className="kk-container lp-showcase-grid">
      <div><span className="lp-kicker">DEMO YANG TERASA NYATA</span><h2>Lihat bagaimana KelasKita terasa setelah dipakai sepanjang tahun.</h2><p>Mode demo berisi 30 siswa, riwayat kehadiran, nilai harian, UH, PTS, PAS, remedial, prestasi, catatan, tindak lanjut, jadwal, dan administrasi. Anda tidak melihat aplikasi kosong—Anda melihat hasil pemakaian nyata.</p><Link className="btn btn-primary" href="/demo">Buka Mode Demo <ArrowRight size={17}/></Link></div>
      <div className="lp-history-card">
        <div className="lp-history-head"><div><small>REKAP KELAS</small><h3>12 bulan terakhir</h3></div><BarChart3 size={22}/></div>
        {[
          ['November 2025','94,2%','81,8'],
          ['Januari 2026','95,1%','82,6'],
          ['Maret 2026','93,7%','83,4'],
          ['Mei 2026','95,9%','84,0'],
          ['Agustus 2026','96,4%','84,3'],
          ['Oktober 2026','95,8%','84,6']
        ].map(x=><div className="lp-history-row" key={x[0]}><b>{x[0]}</b><span>Kehadiran {x[1]}</span><span>Akademik {x[2]}</span></div>)}
      </div>
    </div>
  </section>

  <section className="kk-container lp-section">
    <div className="lp-section-head"><span className="lp-kicker">LAPORAN TANPA KERJA DUA KALI</span><h2>Input sekali. Rekapnya ikut tersusun.</h2></div>
    <div className="lp-report-grid">
      {['Rekap Kehadiran Bulanan','Rekap Kehadiran Semester','Rekap Nilai Semua Mapel','Daftar Siswa Belum Tuntas','Rekap Remedial','Laporan Semester Wali Kelas'].map((x,i)=><article key={x}><span>{String(i+1).padStart(2,'0')}</span><div><b>{x}</b><small>Excel & PDF siap digunakan</small></div><FileText size={19}/></article>)}
    </div>
  </section>

  <section className="kk-container lp-price-wrap">
    <div className="lp-price-card">
      <div><span className="lp-kicker light">KELASKITA</span><h2>Satu lisensi untuk ruang kerja guru yang lebih rapi.</h2><p>Kelola kelas sebagai wali kelas, guru mata pelajaran, atau keduanya. Coba alurnya melalui Mode Demo sebelum membeli.</p></div>
      <div className="lp-price-side"><small>Lisensi KelasKita</small><b>Rp99.000</b><span>sekali bayar</span><Link className="btn lp-white-btn" href="/beli">Beli Sekarang <ArrowRight size={17}/></Link></div>
    </div>
  </section>
</main>}

function Metric({label,value}:{label:string,value:string}){return <div className="lp-mini-stat"><span>{label}</span><b>{value}</b></div>}
function DemoRow({name,note,state}:{name:string;note:string;state:string}){return <div className="lp-demo-row"><div><b>{name}</b><small>{note}</small></div><span>{state}</span></div>}
