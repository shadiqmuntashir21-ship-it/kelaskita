import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSpreadsheet,
  FileText,
  NotebookPen,
  Sparkles,
  Trophy,
  UsersRound
} from 'lucide-react';
import Brand from '@/components/Brand';

const roles=[
  {
    icon:UsersRound,
    label:'WALI KELAS',
    title:'Satu ruang untuk melihat kelas secara utuh.',
    copy:'Siswa, kehadiran, catatan, prestasi, tindak lanjut, administrasi, sampai laporan tetap terhubung dalam satu konteks kelas.'
  },
  {
    icon:BookOpen,
    label:'GURU MATA PELAJARAN',
    title:'Fokus pada pertemuan, penilaian, dan ketuntasan.',
    copy:'Kelola beberapa kelas dan mapel tanpa mencampur data. Nilai lama tetap terbaca dan siswa baru otomatis muncul sebagai belum dinilai.'
  },
  {
    icon:Activity,
    label:'KEDUANYA',
    title:'Berpindah peran tanpa berpindah aplikasi.',
    copy:'Gunakan konteks kelas aktif untuk masuk ke ruang wali atau ruang ajar. Menu berubah mengikuti pekerjaan yang sedang Anda lakukan.'
  }
] as const;

const features=[
  [ClipboardCheck,'Kehadiran cepat','Catat harian atau per pertemuan dengan alur yang ringkas dan riwayat yang tetap bisa dibuka kembali.'],
  [BookOpen,'Kelola nilai','Buka penilaian lama, lihat nilai yang sudah ada, lalu ubah hanya bagian yang memang perlu diubah.'],
  [UsersRound,'Siswa 360°','Nilai, kehadiran, catatan, prestasi, dan tindak lanjut terbaca sebagai satu cerita perkembangan siswa.'],
  [FileSpreadsheet,'Smart Excel Reader','Impor workbook multi-sheet dan multi-kelas dengan pencocokan data yang ketat agar tidak asal menggabungkan siswa.'],
  [NotebookPen,'Catatan yang berguna','Simpan hal penting tanpa membuat guru tenggelam dalam formulir administrasi yang panjang.'],
  [FileText,'Laporan siap pakai','Input sekali, lalu gunakan kembali data yang sama untuk rekap Excel, PDF, dan kebutuhan kelas lainnya.']
] as const;

export default function Landing(){
  return <main className="landing-rebrand">
    <nav className="kk-container landing-nav rebrand-nav">
      <Brand/>
      <div className="landing-nav-actions">
        <Link className="btn btn-ghost" href="/demo">Coba Demo</Link>
        <Link className="btn btn-ghost" href="/masuk">Masuk</Link>
        <Link className="btn btn-dark" href="/beli">Beli KelasKita</Link>
      </div>
    </nav>

    <section className="kk-container rebrand-hero">
      <div className="rebrand-copy">
        <span className="rebrand-kicker"><Sparkles size={14}/> Ruang kerja guru</span>
        <h1>Mengajar sudah cukup sibuk. <span>Mengelola kelas seharusnya tidak.</span></h1>
        <p>KelasKita menyatukan siswa, kehadiran, nilai, catatan, agenda, dan administrasi dalam ruang kerja yang tenang, rapi, dan mengikuti cara guru benar-benar bekerja.</p>
        <div className="rebrand-actions">
          <Link className="btn btn-primary" href="/demo">Coba Mode Demo <ArrowRight size={18}/></Link>
          <Link className="btn btn-ghost" href="/beli">Miliki KelasKita · Rp99.000</Link>
        </div>
        <div className="rebrand-note"><CheckCircle2 size={15}/> Satu lisensi untuk satu guru · multi-kelas · dapat dipasang sebagai PWA</div>
      </div>

      <div className="workspace-preview" aria-label="Preview ruang kerja KelasKita">
        <div className="workspace-glow"/>
        <div className="workspace-window">
          <aside className="workspace-side">
            <div className="workspace-side-mark"><span>K</span>KelasKita</div>
            <i className="active">Beranda</i>
            <i>Kelas</i>
            <i>Kehadiran</i>
            <i>Nilai</i>
            <i>Catatan</i>
            <i>Agenda</i>
          </aside>
          <div className="workspace-main">
            <div className="workspace-top">
              <div className="workspace-greeting"><small>KAMIS, 8 OKTOBER</small><b>Selamat sore, Bu Guru Rina 👋</b></div>
              <div className="workspace-chip">2A · Bahasa Arab</div>
            </div>

            <div className="today-card">
              <div>
                <small>KELAS BERIKUTNYA</small>
                <h3>2A · Bahasa Arab</h3>
                <p>08.00–09.30 · 28 siswa</p>
              </div>
              <button>Mulai Pertemuan →</button>
            </div>

            <div className="workspace-label"><b>Yang perlu diperhatikan</b><span>Hari ini</span></div>
            <div className="attention-grid">
              <div className="attention-tile amber"><span><BookOpen size={14}/></span><b>12 nilai</b><small>belum lengkap</small></div>
              <div className="attention-tile blue"><span><NotebookPen size={14}/></span><b>2 catatan</b><small>perlu ditinjau</small></div>
              <div className="attention-tile green"><span><ClipboardCheck size={14}/></span><b>94%</b><small>kehadiran bulan ini</small></div>
            </div>

            <div className="workspace-label"><b>Aktivitas terbaru</b><span>Lihat semua</span></div>
            <div className="activity-strip">
              <div><i/><b>Nilai Formatif September diperbarui</b><span>14.20</span></div>
              <div><i/><b>Kehadiran kelas 2A selesai</b><span>09.32</span></div>
              <div><i/><b>Catatan Aisyah ditambahkan</b><span>Kemarin</span></div>
            </div>
          </div>
        </div>
        <div className="preview-float a"><b>✓ Kehadiran selesai</b><span>26 hadir · 1 sakit · 1 izin</span></div>
        <div className="preview-float b"><b>3 perubahan</b><span>siap disimpan</span></div>
      </div>
    </section>

    <section className="kk-container rebrand-proof">
      <div><b>Multi-kelas</b><span>Satu akun guru, beberapa ruang kerja.</span></div>
      <div><b>Role-specific</b><span>Menu mengikuti peran guru.</span></div>
      <div><b>Excel + PDF</b><span>Data lama tetap bisa dibawa masuk.</span></div>
      <div><b>Sekali bayar</b><span>Rp99.000 per lisensi guru.</span></div>
    </section>

    <section className="kk-container rebrand-section">
      <div className="rebrand-section-head">
        <span className="eyebrow">BUKAN DASHBOARD GENERIK</span>
        <h2>KelasKita mengikuti pekerjaan guru, bukan sebaliknya.</h2>
        <p>Setiap peran memiliki kebutuhan berbeda. Karena itu pengalaman KelasKita dibentuk berdasarkan konteks kerja, bukan menumpuk semua fitur dalam satu layar.</p>
      </div>
      <div className="role-cards">
        {roles.map(({icon:I,label,title,copy})=><article className="role-card" key={label}>
          <span><I size={22}/></span>
          <small>{label}</small>
          <h3>{title}</h3>
          <p>{copy}</p>
        </article>)}
      </div>
    </section>

    <section className="flow-band">
      <div className="kk-container flow-grid">
        <div className="flow-copy">
          <span className="rebrand-kicker flow-kicker"><Sparkles size={14}/> Dibuat untuk ritme kerja nyata</span>
          <h2>Buka aplikasi. Lihat yang penting. Kerjakan. Selesai.</h2>
          <p>Beranda tidak memaksa guru membaca banyak grafik. KelasKita mengarahkan perhatian ke pekerjaan yang memang perlu dibereskan saat itu.</p>
          <Link className="btn btn-primary" href="/demo">Rasakan lewat Mode Demo <ArrowRight size={17}/></Link>
        </div>
        <div className="flow-stack">
          <div className="flow-step"><span><Clock3 size={19}/></span><div><b>Hari ini</b><small>Lihat kelas berikutnya dan hal yang perlu perhatian.</small></div><i>01</i></div>
          <div className="flow-step"><span><ClipboardCheck size={19}/></span><div><b>Kerjakan langsung</b><small>Masuk ke kehadiran, nilai, catatan, atau agenda tanpa alur berputar.</small></div><i>02</i></div>
          <div className="flow-step"><span><CheckCircle2 size={19}/></span><div><b>Simpan dengan jelas</b><small>Status, perubahan, dan data yang belum lengkap tetap terlihat.</small></div><i>03</i></div>
          <div className="flow-step"><span><Trophy size={19}/></span><div><b>Riwayat tetap terhubung</b><small>Buka kembali perkembangan kelas dan siswa saat dibutuhkan.</small></div><i>04</i></div>
        </div>
      </div>
    </section>

    <section className="kk-container rebrand-section">
      <div className="rebrand-section-head">
        <span className="eyebrow">SEMUA YANG DIBUTUHKAN GURU</span>
        <h2>Lengkap, tetapi tidak terasa berat.</h2>
        <p>Fitur tetap kuat di belakang layar, sementara permukaannya dibuat sederhana agar pekerjaan sehari-hari terasa lebih ringan.</p>
      </div>
      <div className="feature-clean-grid">
        {features.map(([I,title,copy])=><article className="feature-clean" key={title}>
          <span><I size={21}/></span>
          <h3>{title}</h3>
          <p>{copy}</p>
        </article>)}
      </div>
    </section>

    <section className="kk-container rebrand-cta">
      <div>
        <span className="eyebrow">KELASKITA</span>
        <h2>Ruang kerja guru, dibuat lebih sederhana.</h2>
        <p>Coba alur lengkapnya terlebih dahulu melalui Mode Demo, lalu gunakan lisensi untuk data kelas Anda sendiri.</p>
      </div>
      <div className="rebrand-price">
        <small>Lisensi KelasKita · sekali bayar</small>
        <b>Rp99.000</b>
        <Link className="btn btn-primary" href="/beli">Beli KelasKita <ArrowRight size={17}/></Link>
      </div>
    </section>
  </main>
}
