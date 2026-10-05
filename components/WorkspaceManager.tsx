'use client';
import {useState} from 'react';
import {BookOpen,CheckCircle2,Layers3,Plus,Trash2,UsersRound} from 'lucide-react';

export default function WorkspaceManager({data,onChange}:{data:any;onChange:()=>void|Promise<void>}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 const[subjectMode,setSubjectMode]=useState<'existing'|'new'>('existing');
 async function call(body:any,method='POST'){
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/ruang-kerja',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||'Perubahan belum berhasil.');
   await onChange();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function addClass(e:any){e.preventDefault();const b:any=Object.fromEntries(new FormData(e.currentTarget).entries());await call({action:'add_class',name:b.name,academic_year:b.academic_year});e.currentTarget.reset()}
 async function addAssignment(e:any){e.preventDefault();const b:any=Object.fromEntries(new FormData(e.currentTarget).entries());await call({action:'add_assignment',class_id:b.class_id,subject_id:subjectMode==='existing'?b.subject_id:'',subject_name:subjectMode==='new'?b.subject_name:''});e.currentTarget.reset()}
 const mode=data.profile?.usage_mode||'wali';
 return <section className="workspace-manager card">
  <div className="card-head"><div><h3>Ruang Kerja Guru</h3><p className="subtle">Satu lisensi untuk beberapa kelas dan mata pelajaran.</p></div><span className="badge badge-info">{data.classes?.length||0} kelas</span></div>
  {error&&<div className="import-error">{error}</div>}

  <div className="workspace-role-row">
   <div><small>PERAN AKTIF</small><b>{mode==='mapel'?'Guru Mata Pelajaran':mode==='keduanya'?'Wali Kelas + Guru Mapel':'Wali Kelas'}</b></div>
   <select className="input" value={mode} disabled={busy} onChange={e=>call({action:'set_mode',usage_mode:e.target.value})}><option value="wali">Wali Kelas</option><option value="mapel">Guru Mata Pelajaran</option><option value="keduanya">Keduanya</option></select>
  </div>

  <div className="workspace-grid">
   <div className="workspace-column">
    <div className="setup-title"><span><UsersRound size={18}/></span><div><b>Kelas Saya</b><small>Tambah kelas tanpa membuat lisensi baru.</small></div></div>
    <div className="workspace-class-list">{(data.classes||[]).map((c:any)=><div className="workspace-class-row" key={c.id}><div><b>{c.name}</b><small>{c.academic_year}{c.is_homeroom?' · Kelas wali':''}</small></div><div className="row-actions">{!c.is_homeroom&&mode!=='mapel'&&<button className="text-button" disabled={busy} onClick={()=>call({action:'set_homeroom',class_id:c.id})}><CheckCircle2 size={14}/>Jadikan kelas wali</button>}<button className="text-button danger" disabled={busy||c.id===data.profile?.active_class_id} onClick={()=>{if(confirm('Arsipkan kelas ini dari ruang kerja aktif? Data tidak dihapus.'))call({action:'archive_class',class_id:c.id})}}><Trash2 size={14}/>Arsipkan</button></div></div>)}</div>
    <form className="workspace-inline-form" onSubmit={addClass}><input className="input" name="name" placeholder="Nama kelas, contoh 2E" required/><input className="input" name="academic_year" defaultValue={data.profile?.academic_year||'2026/2027'} required/><button className="btn btn-soft" disabled={busy}><Plus size={15}/>Tambah Kelas</button></form>
   </div>

   <div className="workspace-column">
    <div className="setup-title"><span><BookOpen size={18}/></span><div><b>Kelas yang Diajar</b><small>Hubungkan mata pelajaran dengan kelas.</small></div></div>
    <div className="workspace-assignment-list">{(data.teachingAssignments||[]).map((a:any)=><div className="workspace-assignment-row" key={a.id}><span><b>{a.subject_name}</b><small>{a.class_name}</small></span><button className="icon-btn" title="Lepas penugasan" disabled={busy} onClick={()=>call({action:'remove_assignment',id:a.id})}><Trash2 size={15}/></button></div>)}{!(data.teachingAssignments||[]).length&&<div className="empty">Belum ada penugasan mata pelajaran.</div>}</div>
    <form className="workspace-assignment-form" onSubmit={addAssignment}>
     <label className="field"><span>Kelas</span><select className="input" name="class_id" required><option value="">Pilih kelas</option>{(data.classes||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
     <div className="workspace-subject-mode"><button type="button" className={subjectMode==='existing'?'active':''} onClick={()=>setSubjectMode('existing')}>Mapel tersedia</button><button type="button" className={subjectMode==='new'?'active':''} onClick={()=>setSubjectMode('new')}>Mapel baru</button></div>
     {subjectMode==='existing'?<label className="field"><span>Mata Pelajaran</span><select className="input" name="subject_id" required><option value="">Pilih mapel</option>{(data.subjects||[]).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:<label className="field"><span>Nama Mata Pelajaran Baru</span><input className="input" name="subject_name" placeholder="Contoh: Matematika" required/></label>}
     <button className="btn btn-soft full-btn" disabled={busy}><Layers3 size={15}/>Hubungkan Mapel ke Kelas</button>
    </form>
   </div>
  </div>
 </section>
}
