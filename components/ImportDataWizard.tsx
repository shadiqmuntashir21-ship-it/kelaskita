'use client';
import {useMemo,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,Download,FileSpreadsheet,UploadCloud,X} from 'lucide-react';

type Kind='siswa'|'nilai';
const studentFields=[
  ['nis','NIS'],['nisn','NISN'],['name','Nama Lengkap'],['gender','Jenis Kelamin'],['birth_place','Tempat Lahir'],
  ['birth_date','Tanggal Lahir'],['address','Alamat'],['guardian_name','Nama Wali'],['guardian_phone','Nomor Wali'],['phone','Nomor Siswa']
] as const;
const aliases:any={
  nis:['nis','nomor induk','no induk'],
  nisn:['nisn','nomor induk siswa nasional'],
  name:['nama','nama siswa','nama peserta didik','siswa','name'],
  gender:['jenis kelamin','jk','gender'],
  birth_place:['tempat lahir','tempat'],
  birth_date:['tanggal lahir','tgl lahir','ttl'],
  address:['alamat','alamat siswa'],
  guardian_name:['nama wali','wali','nama orang tua','orang tua'],
  guardian_phone:['no. wali siswa','nomor wali','hp wali','no wali','nomor orang tua'],
  phone:['no. siswa','nomor siswa','hp siswa','no hp']
};
const categories=['Tugas Harian','Ulangan Harian','Tengah Semester','Akhir Semester','Lainnya'];
function norm(s:any){return String(s||'').trim().toLowerCase()}
function guess(headers:string[],key:string){return headers.find(h=>aliases[key]?.includes(norm(h)))||''}
function categoryFor(h:string){const x=norm(h);if(/pts|uts|tengah/.test(x))return'Tengah Semester';if(/pas|uas|akhir/.test(x))return'Akhir Semester';if(/uh|ulangan/.test(x))return'Ulangan Harian';if(/proyek|projek|praktik/.test(x))return'Lainnya';return'Tugas Harian'}
function numericColumn(rows:any[],h:string){return rows.slice(0,30).some(r=>{const v=r[h];return v!==''&&v!==null&&Number.isFinite(Number(String(v).replace(',','.')))})}

export default function ImportDataWizard({kind,data,onClose,onDone}:{kind:Kind;data:any;onClose:()=>void;onDone:()=>void}){
  const[step,setStep]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[source,setSource]=useState('');
  const[book,setBook]=useState<any>(null),[sheetIndex,setSheetIndex]=useState(0),[mapping,setMapping]=useState<any>({});
  const[subject,setSubject]=useState(data.subjects?.[0]?.id||''),[semester,setSemester]=useState(data.academicSettings?.active_semester||'Ganjil');
  const[assessments,setAssessments]=useState<any[]>([]),[validation,setValidation]=useState<any>(null),[result,setResult]=useState<any>(null);
  const[strategy,setStrategy]=useState('merge'),[acceptNames,setAcceptNames]=useState(false),[conflict,setConflict]=useState('keep'),[overwrite,setOverwrite]=useState<string[]>([]);
  const sheet=book?.sheets?.[sheetIndex],headers=sheet?.headers||[],rows=sheet?.rows||[];
  const selectedAssessments=useMemo(()=>assessments.filter(x=>x.include),[assessments]);

  function initSheet(s:any){
    if(kind==='siswa'){
      const m:any={};studentFields.forEach(([k])=>m[k]=guess(s.headers,k));setMapping(m);
    }else{
      const identity={nis:guess(s.headers,'nis'),nisn:guess(s.headers,'nisn'),name:guess(s.headers,'name')};setMapping(identity);
      const ids=new Set(Object.values(identity).filter(Boolean) as string[]);
      setAssessments(s.headers.filter((h:string)=>!ids.has(h)&&numericColumn(s.rows,h)).map((h:string)=>({column:h,name:h,category:categoryFor(h),date:new Date().toISOString().slice(0,10),maxScore:100,include:true})));
    }
  }
  async function upload(file?:File){
    if(!file)return;setBusy(true);setError('');
    try{
      const fd=new FormData();fd.append('file',file);const r=await fetch('/api/impor/preview',{method:'POST',body:fd});const j=await r.json();
      if(!r.ok)throw new Error(j.message);setBook(j);setSource(j.sourceName);setSheetIndex(0);initSheet(j.sheets[0]);setStep(2);
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  function changeSheet(i:number){setSheetIndex(i);initSheet(book.sheets[i]);setValidation(null)}
  function payload(action:string){return kind==='siswa'?{
    action,sourceName:source,rows,mapping,strategy,acceptNameMatches:acceptNames
  }:{
    action,sourceName:source,rows,identity:mapping,subject_id:subject,semester,assessments:selectedAssessments,
    conflictStrategy:conflict,acceptNameMatches:acceptNames,overwriteKeys:overwrite
  }}
  async function validate(){
    if(kind==='siswa'&&!mapping.name)return setError('Pilih kolom Nama Lengkap.');
    if(kind==='nilai'&&!subject)return setError('Pilih mata pelajaran.');
    if(kind==='nilai'&&!selectedAssessments.length)return setError('Pilih minimal satu kolom nilai.');
    setBusy(true);setError('');
    try{const r=await fetch(kind==='siswa'?'/api/impor/siswa':'/api/impor/nilai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload('validate'))});const j=await r.json();if(!r.ok)throw new Error(j.message);setValidation(j);setOverwrite(j.conflicts?.map((x:any)=>x.key)||[]);setStep(3)}catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  async function commit(){
    setBusy(true);setError('');
    try{const r=await fetch(kind==='siswa'?'/api/impor/siswa':'/api/impor/nilai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload('commit'))});const j=await r.json();if(!r.ok)throw new Error(j.message);setResult(j);setStep(4);onDone()}catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="modal-backdrop import-backdrop"><div className="modal modal-wide import-modal">
    <div className="modal-head"><div><span className="eyebrow">IMPOR DATA · LANGKAH {step}/4</span><h2>{kind==='siswa'?'Impor Data Siswa':'Impor Rekap Nilai Excel'}</h2><p>{kind==='siswa'?'Bawa data siswa lama tanpa input ulang satu per satu.':'Masukkan nilai yang sudah berjalan sebelum Anda mulai memakai KelasKita.'}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
    <div className="import-steps">{['File Excel','Pemetaan','Validasi','Selesai'].map((x,i)=><span key={x} className={step>=i+1?'on':''}>{i+1}<b>{x}</b></span>)}</div>
    {error&&<div className="import-error"><AlertTriangle size={16}/>{error}</div>}

    {step===1&&<div className="import-upload">
      <UploadCloud size={34}/><h3>Pilih file Excel Anda</h3><p>KelasKita membaca file <b>.xlsx</b>, menampilkan preview, lalu Anda menentukan kolom mana yang masuk.</p>
      <label className="btn btn-primary">Pilih File Excel<input hidden type="file" accept=".xlsx" onChange={e=>upload(e.target.files?.[0])}/></label>
      <a className="btn btn-ghost" href={kind==='siswa'?'/api/siswa/import':'/api/impor/nilai/template'}><Download size={16}/>Unduh Template KelasKita</a>
    </div>}

    {step===2&&sheet&&<div className="import-body">
      <div className="import-source"><FileSpreadsheet size={20}/><div><b>{source}</b><small>{rows.length} baris · header ditemukan di baris {sheet.headerRow}</small></div>{book.sheets.length>1&&<select className="input" value={sheetIndex} onChange={e=>changeSheet(Number(e.target.value))}>{book.sheets.map((s:any,i:number)=><option value={i} key={s.name}>{s.name}</option>)}</select>}</div>
      {kind==='siswa'?<div className="mapping-grid">{studentFields.map(([k,label])=><label className="field" key={k}><span>{label}{k==='name'?' *':''}</span><select className="input" value={mapping[k]||''} onChange={e=>setMapping((m:any)=>({...m,[k]:e.target.value}))}><option value="">Tidak dipakai</option>{headers.map((h:string)=><option key={h}>{h}</option>)}</select></label>)}</div>:<>
        <div className="import-settings"><label className="field"><span>Mata Pelajaran *</span><select className="input" value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{data.subjects.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Semester *</span><select className="input" value={semester} onChange={e=>setSemester(e.target.value)}><option>Ganjil</option><option>Genap</option></select></label></div>
        <div className="mapping-grid identity-map">{[['nisn','NISN'],['nis','NIS'],['name','Nama Siswa']].map(([k,l])=><label className="field" key={k}><span>{l}</span><select className="input" value={mapping[k]||''} onChange={e=>setMapping((m:any)=>({...m,[k]:e.target.value}))}><option value="">Tidak dipakai</option>{headers.map((h:string)=><option key={h}>{h}</option>)}</select></label>)}</div>
        <div className="assessment-map"><div className="card-head"><div><h3>Kolom nilai yang akan diimpor</h3><p className="subtle">Ubah nama dan kategori bila Excel Anda memakai istilah sendiri.</p></div><span className="badge badge-info">{selectedAssessments.length} dipilih</span></div>
          {assessments.map((a,i)=><div className="assessment-map-row" key={a.column}><input type="checkbox" checked={a.include} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,include:e.target.checked}:x))}/><div><small>Kolom Excel</small><b>{a.column}</b></div><input className="input" value={a.name} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><select className="input" value={a.category} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,category:e.target.value}:x))}>{categories.map(c=><option key={c}>{c}</option>)}</select><input className="input" type="date" value={a.date} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,date:e.target.value}:x))}/><input className="input" type="number" min="1" value={a.maxScore} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,maxScore:Number(e.target.value)}:x))}/></div>)}
        </div>
      </>}
      <div className="import-preview"><b>Preview data</b><div className="table-wrap"><table className="table"><thead><tr>{headers.slice(0,8).map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,5).map((r:any,i:number)=><tr key={i}>{headers.slice(0,8).map((h:string)=><td key={h}>{String(r[h]??'')}</td>)}</tr>)}</tbody></table></div></div>
    </div>}

    {step===3&&validation&&<div className="import-review">
      <div className="import-stat-grid">{kind==='siswa'?<>
        <Metric label="Baris terbaca" value={validation.stats.total}/><Metric label="Siswa baru" value={validation.stats.new}/><Metric label="Cocok NIS/NISN" value={validation.stats.exact}/><Metric label="Perlu tinjau nama" value={validation.stats.nameReview}/>
      </>:<>
        <Metric label="Siswa cocok" value={validation.stats.matched}/><Metric label="Nilai terbaca" value={validation.stats.values}/><Metric label="Penilaian baru" value={validation.stats.newAssessments}/><Metric label="Konflik nilai" value={validation.stats.conflicts}/>
      </>}</div>
      {kind==='siswa'?<div className="grid-2"><section className="card"><h3>Jika siswa sudah ada</h3><label className="radio-line"><input type="radio" checked={strategy==='merge'} onChange={()=>setStrategy('merge')}/> Perbarui/lengkapi data dari Excel</label><label className="radio-line"><input type="radio" checked={strategy==='skip'} onChange={()=>setStrategy('skip')}/> Pertahankan data KelasKita</label></section><section className="card"><h3>Pencocokan berdasarkan nama</h3><p className="subtle">{validation.stats.nameReview} baris hanya cocok lewat nama unik.</p><label className="switch-line"><input type="checkbox" checked={acceptNames} onChange={e=>setAcceptNames(e.target.checked)}/> Izinkan kecocokan nama unik</label><p className="subtle">Baris ambigu tetap tidak akan diimpor.</p></section></div>:<>
        <section className="card"><h3>Jika nilai sudah ada di KelasKita</h3><div className="conflict-options"><button className={conflict==='keep'?'active':''} onClick={()=>setConflict('keep')}>Pertahankan nilai lama</button><button className={conflict==='overwrite'?'active':''} onClick={()=>setConflict('overwrite')}>Ganti dengan Excel</button><button className={conflict==='review'?'active':''} onClick={()=>setConflict('review')}>Tinjau satu per satu</button></div><label className="switch-line"><input type="checkbox" checked={acceptNames} onChange={e=>setAcceptNames(e.target.checked)}/> Izinkan pencocokan siswa berdasarkan nama unik</label></section>
        {conflict==='review'&&validation.conflicts?.length>0&&<section className="card conflict-list"><div className="card-head"><h3>Konflik nilai</h3><span className="subtle">Centang untuk memakai nilai Excel.</span></div>{validation.conflicts.map((c:any)=><label key={c.key}><input type="checkbox" checked={overwrite.includes(c.key)} onChange={e=>setOverwrite(v=>e.target.checked?[...new Set([...v,c.key])]:v.filter(x=>x!==c.key))}/><span><b>{c.studentName}</b><small>{c.assessmentName}: KelasKita {c.existingScore} → Excel {c.newScore}</small></span></label>)}</section>}
      </>}
      {(validation.stats.ambiguous>0||validation.stats.unmatched>0)&&<div className="import-warning"><AlertTriangle size={16}/><span>{validation.stats.ambiguous||0} ambigu dan {validation.stats.unmatched||0} tidak cocok akan dilewati agar data siswa tidak salah.</span></div>}
    </div>}

    {step===4&&result&&<div className="import-done"><CheckCircle2 size={42}/><h3>Impor selesai</h3>{kind==='siswa'?<p><b>{result.inserted}</b> siswa baru ditambahkan, <b>{result.updated}</b> diperbarui, dan <b>{result.skipped}</b> dilewati.</p>:<p><b>{result.imported}</b> nilai masuk, <b>{result.createdAssessments}</b> penilaian dibuat, dan <b>{result.kept}</b> nilai lama dipertahankan.</p>}<p className="subtle">Data yang masuk langsung dipakai oleh Siswa 360°, rekap akademik, remedial, peringatan, dan laporan.</p></div>}

    <div className="modal-actions import-actions">
      {step>1&&step<4&&<button className="btn btn-ghost" onClick={()=>setStep(step-1)} disabled={busy}><ArrowLeft size={16}/>Kembali</button>}
      {step===2&&<button className="btn btn-primary" onClick={validate} disabled={busy}>Validasi Data <ArrowRight size={16}/></button>}
      {step===3&&<button className="btn btn-primary" onClick={commit} disabled={busy}>{busy?'Mengimpor…':'Impor ke KelasKita'} <ArrowRight size={16}/></button>}
      {step===4&&<button className="btn btn-primary" onClick={onClose}>Selesai</button>}
    </div>
  </div></div>
}
function Metric({label,value}:{label:string;value:any}){return <div className="import-metric"><span>{label}</span><b>{value}</b></div>}
