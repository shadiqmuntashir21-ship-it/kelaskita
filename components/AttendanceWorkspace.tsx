'use client';

import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,Check,ChevronLeft,ChevronRight,RotateCcw} from 'lucide-react';

const statuses=['Hadir','Sakit','Izin','Alfa','Terlambat','Dispensasi'];

function isoToday(){
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function indo(v:string){
 if(!v)return'-';
 return new Date(v+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function monthLabel(v:string){
 const d=new Date(v.slice(0,7)+'-01T00:00:00');
 return d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
}
function shiftMonth(v:string,delta:number){
 const d=new Date(v.slice(0,7)+'-01T00:00:00');
 d.setMonth(d.getMonth()+delta);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}
function calendarCells(date:string){
 const d=new Date(date.slice(0,7)+'-01T00:00:00');
 const year=d.getFullYear(),month=d.getMonth();
 const first=(d.getDay()+6)%7;
 const days=new Date(year,month+1,0).getDate();
 const out:(string|null)[]=Array(first).fill(null);
 for(let x=1;x<=days;x++)out.push(`${year}-${String(month+1).padStart(2,'0')}-${String(x).padStart(2,'0')}`);
 while(out.length%7)out.push(null);
 return out;
}

export default function AttendanceWorkspace({
 mode,usageMode,isHomeroom,classId,className,students,subjects,onSaved,onMessage
}:{mode:'demo'|'real';usageMode:string;isHomeroom:boolean;classId:string;className:string;students:any[];subjects:any[];onSaved:()=>void|Promise<void>;onMessage:(x:string)=>void}){
 const isMapel=usageMode==='mapel'||(usageMode==='keduanya'&&!isHomeroom);
 const[date,setDate]=useState(isoToday()),[subjectId,setSubjectId]=useState(subjects?.[0]?.id||'');
 const[draft,setDraft]=useState<Record<string,{status:string;note:string}>>({});
 const[marked,setMarked]=useState<any[]>([]),[exists,setExists]=useState(false),[busy,setBusy]=useState(false);
 const[loadedDate,setLoadedDate]=useState('');

 useEffect(()=>{if(subjects?.length&&!subjects.some((s:any)=>s.id===subjectId))setSubjectId(subjects[0].id)},[subjects,subjectId]);

 async function load(){
  if(!classId||!students)return;
  if(mode==='demo'){
   const x:any={};students.forEach((s:any)=>x[s.id]={status:'Hadir',note:''});setDraft(x);setMarked([]);setExists(false);setLoadedDate(date);return;
  }
  if(isMapel&&!subjectId){setDraft({});return}
  setBusy(true);
  try{
   const q=new URLSearchParams({class_id:classId,date,month:date.slice(0,7)});
   if(isMapel)q.set('subject_id',subjectId);
   const r=await fetch((isMapel?'/api/kehadiran-mapel':'/api/kehadiran')+'?'+q.toString(),{cache:'no-store'});
   const j=await r.json();if(!r.ok)throw new Error(j.message||'Kehadiran belum dapat dimuat.');
   const x:any={};students.forEach((s:any)=>x[s.id]={status:'Hadir',note:''});
   (j.records||[]).forEach((a:any)=>x[a.student_id]={status:a.status||'Hadir',note:a.note||''});
   setDraft(x);setMarked(j.dates||[]);setExists(!!j.exists);setLoadedDate(date);
  }catch(e:any){onMessage(e.message||'Kehadiran belum dapat dimuat.')}finally{setBusy(false)}
 }
 useEffect(()=>{load()},[classId,date,subjectId,students.length,usageMode]);

 const counts=useMemo(()=>{
  const vals=Object.values(draft);
  return statuses.reduce((m:any,s)=>{m[s]=vals.filter(x=>x.status===s).length;return m},{} as any)
 },[draft]);
 const dayMap=useMemo(()=>new Map(marked.map((x:any)=>[String(x.date).slice(0,10),x])),[marked]);
 const cells=calendarCells(date);

 function setAll(status:string){setDraft(d=>{const x:any={...d};students.forEach((s:any)=>x[s.id]={...(x[s.id]||{}),status});return x})}
 async function save(){
  if(!classId)return;
  if(isMapel&&!subjectId)return onMessage('Pilih mata pelajaran terlebih dahulu.');
  if(mode==='demo'){setExists(true);return onMessage('Kehadiran demo disimpan sementara.')}
  setBusy(true);
  try{
   const records=students.map((s:any)=>({student_id:s.id,status:draft[s.id]?.status||'Hadir',note:draft[s.id]?.note||''}));
   const body:any={class_id:classId,date,records};
   if(isMapel){body.subject_id=subjectId;body.meeting_no=1}
   const r=await fetch(isMapel?'/api/kehadiran-mapel':'/api/kehadiran',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const j=await r.json();if(!r.ok)throw new Error(j.message||'Kehadiran belum berhasil disimpan.');
   setExists(true);onMessage(isMapel?'Kehadiran pertemuan disimpan.':'Kehadiran harian disimpan.');
   await load();await onSaved();
  }catch(e:any){onMessage(e.message||'Kehadiran belum berhasil disimpan.')}finally{setBusy(false)}
 }
 function changeMonth(delta:number){const next=shiftMonth(date,delta);setDate(next)}

 return <div className="attendance-workspace">
  <section className="attendance-control card">
   <div className="attendance-control-top">
    <div><span className="eyebrow">{isMapel?'KEHADIRAN PERTEMUAN':'KEHADIRAN HARIAN'}</span><h3>{className}</h3><p>{isMapel?'Absensi tersimpan per kelas, mata pelajaran, dan tanggal.':'Pilih tanggal untuk melihat atau mengubah absensi harian kelas.'}</p></div>
    <span className={'badge '+(exists?'badge-good':'badge-warn')}>{exists?'Sudah tersimpan':'Belum disimpan'}</span>
   </div>
   <div className="attendance-selectors">
    {isMapel&&<label><span>Mata Pelajaran</span><select className="input" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>{subjects.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
    <label><span>Tanggal</span><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   </div>
   <div className="attendance-selected-date"><CalendarDays size={16}/><b>{indo(date)}</b><small>{loadedDate===date?(exists?'Data tanggal ini dimuat dan bisa diedit.':'Belum ada data. Isi lalu simpan.'):'Memuat data...'}</small></div>
  </section>

  <div className="attendance-layout">
   <section className="card attendance-calendar-card">
    <div className="calendar-head"><button className="icon-btn" onClick={()=>changeMonth(-1)}><ChevronLeft size={17}/></button><b>{monthLabel(date)}</b><button className="icon-btn" onClick={()=>changeMonth(1)}><ChevronRight size={17}/></button></div>
    <div className="calendar-week">{['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(x=><span key={x}>{x}</span>)}</div>
    <div className="calendar-grid">{cells.map((d,i)=>d?<button key={d} className={(d===date?'selected ':'')+(dayMap.has(d)?((Number(dayMap.get(d)?.record_count)||0)>=students.length?'complete':'partial'):'')} onClick={()=>setDate(d)}><span>{Number(d.slice(-2))}</span>{dayMap.has(d)&&<i/>}</button>:<span key={'e'+i}/>)}</div>
    <div className="calendar-legend"><span><i className="complete"/>Sudah diisi</span><span><i className="partial"/>Sebagian</span></div>
   </section>

   <section className="card attendance-entry-card">
    <div className="attendance-summary">
     <div><small>Hadir</small><b>{counts.Hadir||0}</b></div><div><small>Sakit</small><b>{counts.Sakit||0}</b></div><div><small>Izin</small><b>{counts.Izin||0}</b></div><div><small>Alfa</small><b>{counts.Alfa||0}</b></div>
    </div>
    <div className="attendance-actions"><button className="btn btn-soft" onClick={()=>setAll('Hadir')}><RotateCcw size={15}/>Semua Hadir</button><span className="subtle">{students.length} siswa · {indo(date)}</span></div>
    <div className="attendance-list attendance-edit-list">{students.map((st:any)=><div className="attendance-row" key={st.id}><div className="student-main"><div className="avatar">{String(st.name||'').split(' ').slice(0,2).map((x:string)=>x[0]).join('').toUpperCase()}</div><div><b>{st.name}</b><small>NIS {st.nis||'-'}</small></div></div><select className="input attendance-select" value={draft[st.id]?.status||'Hadir'} onChange={e=>setDraft(d=>({...d,[st.id]:{...(d[st.id]||{note:''}),status:e.target.value}}))}>{statuses.map(x=><option key={x}>{x}</option>)}</select><input className="input attendance-note" placeholder="Catatan opsional" value={draft[st.id]?.note||''} onChange={e=>setDraft(d=>({...d,[st.id]:{...(d[st.id]||{status:'Hadir'}),note:e.target.value}}))}/></div>)}</div>
    <div className="right-actions"><button className="btn btn-primary" onClick={save} disabled={busy||!students.length}><Check size={16}/>{busy?'Menyimpan...':exists?'Simpan Perubahan':'Simpan Kehadiran'}</button></div>
   </section>
  </div>
 </div>
}
