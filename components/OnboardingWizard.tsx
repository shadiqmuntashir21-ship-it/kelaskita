'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,FileSpreadsheet,GraduationCap,Layers3,UsersRound,X} from 'lucide-react';

type Role='wali'|'mapel'|'keduanya';

export default function OnboardingWizard({
 profile,classes=[],subjects=[],onClose,onImportStudents,onImportScores,onComplete
}:{profile:any;classes?:any[];subjects?:any[];onClose:()=>void;onImportStudents:()=>void;onImportScores:()=>void;onComplete:(payload:any)=>Promise<void>}){
 const[step,setStep]=useState(1),[role,setRole]=useState<Role|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const existingHomeroom=classes.find((x:any)=>x.is_homeroom)||classes[0];
 const[homeroomId,setHomeroomId]=useState(existingHomeroom?.id||'');
 const[homeroomName,setHomeroomName]=useState(existingHomeroom?.name||profile?.class_name||'');
 const[subjectId,setSubjectId]=useState(subjects[0]?.id||'');
 const[subjectName,setSubjectName]=useState('');
 const[teachingText,setTeachingText]=useState(existingHomeroom?.name||profile?.class_name||'');
 const teachingClasses=useMemo(()=>[...new Set(teachingText.split(/[\n,;]+/).map((x:string)=>x.trim()).filter(Boolean))],[teachingText]);

 function choose(r:Role){setRole(r);setError('');setStep(2)}
 async function finish(){
  if(!role)return;
  if((role==='wali'||role==='keduanya')&&!homeroomId&&!homeroomName.trim())return setError('Isi atau pilih kelas wali Anda.');
  if((role==='mapel'||role==='keduanya')&&!subjectId&&!subjectName.trim())return setError('Pilih atau isi mata pelajaran yang Anda ajar.');
  if((role==='mapel'||role==='keduanya')&&!teachingClasses.length)return setError('Tambahkan minimal satu kelas yang Anda ajar.');
  setBusy(true);setError('');
  try{
   await onComplete({
    usage_mode:role,completed:true,
    homeroom_class_id:homeroomId||null,
    homeroom_class_name:homeroomName.trim(),
    subject_id:subjectId||null,
    subject_name:subjectId?'':subjectName.trim(),
    teaching_classes:teachingClasses,
    academic_year:profile?.academic_year
   });
  }catch(e:any){setError(e.message||'Pengaturan belum berhasil disimpan.')}finally{setBusy(false)}
 }

 return <div className="modal-backdrop onboarding-backdrop"><div className="modal onboarding-modal onboarding-v5">
  <div className="modal-head"><div><span className="eyebrow">KELASKITA V5 · PENGATURAN SATU KALI</span><h2>{step===1?'Bagaimana Anda menggunakan KelasKita?':step===2?'Siapkan ruang kerja guru':'Bawa data yang sudah berjalan'}</h2><p>{step===1?'Lisensi Anda tetap sama. Pilihan ini hanya mengatur ruang kerja yang paling sesuai.':step===2?'Satu lisensi dapat memuat beberapa kelas dan mata pelajaran.':'Langkah ini opsional. Anda bisa mengimpor Excel sekarang atau nanti.'}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
  <div className="import-steps">{['Peran Guru','Ruang Kerja','Data Awal'].map((x,i)=><span key={x} className={step>=i+1?'on':''}>{i+1}<b>{x}</b></span>)}</div>
  {error&&<div className="import-error">{error}</div>}

  {step===1&&<div className="role-choice">
   <button onClick={()=>choose('wali')}><span><UsersRound size={24}/></span><div><b>Saya Wali Kelas</b><small>Kelola siswa, kehadiran, akademik, catatan, administrasi, dan laporan satu kelas secara menyeluruh.</small></div><ArrowRight size={18}/></button>
   <button onClick={()=>choose('mapel')}><span><BookOpen size={24}/></span><div><b>Saya Guru Mata Pelajaran</b><small>Kelola penilaian, nilai, remedial, dan progres belajar di beberapa kelas.</small></div><ArrowRight size={18}/></button>
   <button onClick={()=>choose('keduanya')}><span><Layers3 size={24}/></span><div><b>Saya Keduanya</b><small>Gunakan ruang wali kelas sekaligus ruang guru mata pelajaran dalam satu akun.</small></div><ArrowRight size={18}/></button>
  </div>}

  {step===2&&role&&<div className="onboarding-v5-form">
   {(role==='wali'||role==='keduanya')&&<section className="setup-card">
    <div className="setup-title"><span><UsersRound size={20}/></span><div><b>Kelas wali</b><small>Data lama Anda tidak dihapus. Kelas existing bisa langsung dipakai.</small></div></div>
    {classes.length>0&&<label className="field"><span>Gunakan kelas yang sudah ada</span><select className="input" value={homeroomId} onChange={e=>{setHomeroomId(e.target.value);const x=classes.find((c:any)=>c.id===e.target.value);if(x)setHomeroomName(x.name)}}><option value="">Buat / beri nama kelas lain</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name+' · '+c.academic_year}</option>)}</select></label>}
    <label className="field"><span>Nama kelas wali</span><input className="input" value={homeroomName} onChange={e=>{setHomeroomName(e.target.value);if(homeroomId&&classes.find((c:any)=>c.id===homeroomId)?.name!==e.target.value)setHomeroomId('')}} placeholder="Contoh: XI DKV 1"/></label>
   </section>}

   {(role==='mapel'||role==='keduanya')&&<section className="setup-card">
    <div className="setup-title"><span><GraduationCap size={20}/></span><div><b>Mata pelajaran & kelas yang diajar</b><small>Anda bisa menambah mapel lain setelah onboarding.</small></div></div>
    <label className="field"><span>Mata pelajaran</span><select className="input" value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">+ Buat mata pelajaran baru</option>{subjects.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    {!subjectId&&<label className="field"><span>Nama mata pelajaran</span><input className="input" value={subjectName} onChange={e=>setSubjectName(e.target.value)} placeholder="Contoh: Matematika"/></label>}
    <label className="field"><span>Kelas yang diajar</span><textarea className="input" rows={4} value={teachingText} onChange={e=>setTeachingText(e.target.value)} placeholder={'Contoh:\n2A\n2B\n2C\n2D'}/><small>Satu kelas per baris atau pisahkan dengan koma. {teachingClasses.length?(teachingClasses.length+' kelas terdeteksi.'):''}</small></label>
   </section>}

   <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setStep(1)}><ArrowLeft size={16}/>Kembali</button><button className="btn btn-primary" onClick={()=>setStep(3)}>Lanjut <ArrowRight size={16}/></button></div>
  </div>}

  {step===3&&<div className="onboarding-existing">
   <div className="setup-step"><span>1</span><div><b>Impor daftar siswa</b><small>Excel tidak harus mengikuti template persis. KelasKita akan mencoba membaca struktur yang ada.</small></div><button className="btn btn-soft" onClick={onImportStudents}><UsersRound size={16}/>Impor Siswa</button></div>
   <div className="setup-step"><span>2</span><div><b>Impor nilai lintas kelas</b><small>Workbook beberapa sheet seperti 2A, 2B, 2C, 2D akan dibaca sebagai kumpulan kelas.</small></div><button className="btn btn-soft" onClick={onImportScores}><FileSpreadsheet size={16}/>Impor Nilai</button></div>
   <div className="onboarding-finish"><p>Lisensi, PIN, pembayaran, perangkat, serta data lama tetap dipertahankan. Anda dapat melengkapi ruang kerja lain setelah masuk.</p><div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setStep(2)}><ArrowLeft size={16}/>Kembali</button><button className="btn btn-primary" disabled={busy} onClick={finish}><CheckCircle2 size={16}/>{busy?'Menyimpan…':'Selesai & Masuk KelasKita'}</button></div></div>
  </div>}
 </div></div>
}
