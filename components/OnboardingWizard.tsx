'use client';
import {useState} from 'react';
import {ArrowRight,BookOpen,CalendarDays,CheckCircle2,FileSpreadsheet,UsersRound,X} from 'lucide-react';

export default function OnboardingWizard({profile,onClose,onImportStudents,onImportScores,onOpenSubjects,onOpenSchedule,onComplete}:{profile:any;onClose:()=>void;onImportStudents:()=>void;onImportScores:()=>void;onOpenSubjects:()=>void;onOpenSchedule:()=>void;onComplete:()=>Promise<void>}){
  const[mode,setMode]=useState<'choice'|'existing'>('choice'),[busy,setBusy]=useState(false);
  async function finish(){setBusy(true);try{await onComplete()}finally{setBusy(false)}}
  return <div className="modal-backdrop onboarding-backdrop"><div className="modal onboarding-modal">
    <div className="modal-head"><div><span className="eyebrow">SELAMAT DATANG DI KELASKITA</span><h2>Siapkan {profile?.class_name||'kelas Anda'}</h2><p>Anda bisa mulai dari nol atau membawa data yang sudah berjalan dari Excel.</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
    {mode==='choice'?<div className="onboarding-choice">
      <button onClick={finish} disabled={busy}><span><CheckCircle2 size={22}/></span><div><b>Mulai dari awal</b><small>Saya baru mulai mengelola kelas dan ingin mengisi data langsung di KelasKita.</small></div><ArrowRight size={18}/></button>
      <button onClick={()=>setMode('existing')}><span><FileSpreadsheet size={22}/></span><div><b>Saya sudah punya data</b><small>Siswa, nilai, atau jadwal saya sudah berjalan dan ingin saya bawa ke KelasKita.</small></div><ArrowRight size={18}/></button>
    </div>:<div className="onboarding-existing">
      <div className="setup-step"><span>1</span><div><b>Impor daftar siswa</b><small>Upload Excel siswa lalu cocokkan NISN, NIS, nama, dan kolom lainnya.</small></div><button className="btn btn-soft" onClick={onImportStudents}><UsersRound size={16}/>Impor Siswa</button></div>
      <div className="setup-step"><span>2</span><div><b>Atur mata pelajaran</b><small>Buat mapel dan batas ketuntasan yang dipakai di kelas.</small></div><button className="btn btn-soft" onClick={onOpenSubjects}><BookOpen size={16}/>Buka Akademik</button></div>
      <div className="setup-step"><span>3</span><div><b>Impor nilai yang sudah berjalan</b><small>Tugas, UH, PTS, PAS, proyek, dan nilai lain akan langsung terhubung ke siswa.</small></div><button className="btn btn-soft" onClick={onImportScores}><FileSpreadsheet size={16}/>Impor Nilai</button></div>
      <div className="setup-step"><span>4</span><div><b>Atur jadwal pelajaran</b><small>Lengkapi jadwal mingguan agar Beranda menampilkan pelajaran hari ini.</small></div><button className="btn btn-soft" onClick={onOpenSchedule}><CalendarDays size={16}/>Buka Jadwal</button></div>
      <div className="onboarding-finish"><p>Anda tidak harus menyelesaikan semuanya sekaligus. Data yang sudah diimpor langsung aman di cloud dan bisa dilanjutkan dari perangkat lain.</p><button className="btn btn-primary" disabled={busy} onClick={finish}>{busy?'Menyimpan…':'Selesai, Masuk ke KelasKita'}</button></div>
    </div>}
  </div></div>
}
