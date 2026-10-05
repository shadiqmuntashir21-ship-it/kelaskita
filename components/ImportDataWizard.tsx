'use client';
import {useMemo,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,Download,FileSpreadsheet,Layers3,Sparkles,UploadCloud,X} from 'lucide-react';

type Kind='siswa'|'nilai';
const studentFields=[
 ['nis','NIS'],['nisn','NISN'],['name','Nama Lengkap'],['gender','Jenis Kelamin'],['class_name','Kelas'],
 ['birth_place','Tempat Lahir'],['birth_date','Tanggal Lahir'],['address','Alamat'],
 ['guardian_name','Nama Wali'],['guardian_phone','Nomor Wali'],['phone','Nomor Siswa']
] as const;
const categories=['Tugas Harian','Ulangan Harian','Tengah Semester','Akhir Semester','Lainnya'];
function norm(v:any){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function fallbackGuess(headers:string[],key:string){
 const rx:any={
  nisn:/^nisn$/,nis:/^nis$|nomor induk/,name:/^nama$|nama siswa|nama peserta|peserta didik|murid/,
  gender:/jenis kelamin|^jk$|l\s*\/\s*p/,class_name:/^kelas$|rombel/,birth_place:/tempat lahir/,
  birth_date:/tanggal lahir|tgl lahir/,address:/alamat/,guardian_name:/wali|orang tua|ortu/,
  guardian_phone:/(wali|orang tua|ortu).*(no|nomor|hp|wa)|(no|nomor|hp|wa).*(wali|orang tua|ortu)/,
  phone:/^(no|nomor|hp|wa).*(siswa)?$/
 };
 return headers.find(h=>rx[key]?.test(norm(h)))||'';
}
function closestSubject(subjects:any[],hint:string){
 if(!hint)return null;const h=norm(hint);
 return subjects.find((s:any)=>norm(s.name)===h)||subjects.find((s:any)=>h.includes(norm(s.name))||norm(s.name).includes(h))||null;
}
function withDates(cols:any[]){return(cols||[]).map((x:any)=>({...x,date:x.date||new Date().toISOString().slice(0,10)}))}

export default function ImportDataWizard({kind,data,onClose,onDone}:{kind:Kind;data:any;onClose:()=>void;onDone:()=>void}){
 const[step,setStep]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[source,setSource]=useState('');
 const[book,setBook]=useState<any>(null),[sheetIndex,setSheetIndex]=useState(0),[mapping,setMapping]=useState<any>({});
 const[subject,setSubject]=useState(''),[newSubject,setNewSubject]=useState(''),[semester,setSemester]=useState(data.academicSettings?.active_semester||'Ganjil');
 const[assessments,setAssessments]=useState<any[]>([]),[validation,setValidation]=useState<any>(null),[result,setResult]=useState<any>(null);
 const[strategy,setStrategy]=useState('merge'),[acceptNames,setAcceptNames]=useState(true),[conflict,setConflict]=useState('keep'),[overwrite,setOverwrite]=useState<string[]>([]);
 const[applyDetectedClass,setApplyDetectedClass]=useState(true),[multiMode,setMultiMode]=useState(false),[classNames,setClassNames]=useState<Record<string,string>>({});
 const sheet=book?.sheets?.[sheetIndex],headers=sheet?.headers||[],rows=sheet?.rows||[];
 const selectedAssessments=useMemo(()=>assessments.filter((x:any)=>x.include),[assessments]);
 const subjectCatalog=data.subjectCatalog||data.subjects||[];
 const multiSheets=useMemo(()=>kind==='nilai'?(book?.sheets||[]).filter((s:any)=>s.classHint&&s.suggestions?.name&&(s.scoreColumns||[]).length):[],[book,kind]);

 function initSheet(s:any){
  const suggestions=s?.suggestions||{};
  if(kind==='siswa'){
   const m:any={};studentFields.forEach(([k])=>m[k]=suggestions[k]||fallbackGuess(s.headers||[],k));setMapping(m);
   setApplyDetectedClass(!!(s.classHint||m.class_name));
  }else{
   setMapping({
    nis:suggestions.nis||fallbackGuess(s.headers||[],'nis'),
    nisn:suggestions.nisn||fallbackGuess(s.headers||[],'nisn'),
    name:suggestions.name||fallbackGuess(s.headers||[],'name')
   });
   setAssessments(withDates(s.scoreColumns||[]));
   const hit=closestSubject(subjectCatalog,s.subjectHint||'');
   if(hit){setSubject(hit.id);setNewSubject('')}
   else if(s.subjectHint){setSubject('__new__');setNewSubject(s.subjectHint)}
   else if((subjectCatalog).length===1){setSubject(subjectCatalog[0].id);setNewSubject('')}
   else{setSubject('');setNewSubject('')}
  }
 }
 function initMulti(j:any){
  const eligible=(j.sheets||[]).filter((s:any)=>s.classHint&&s.suggestions?.name&&(s.scoreColumns||[]).length);
  const names:Record<string,string>={};eligible.forEach((s:any)=>names[s.name]=s.classHint||s.name);setClassNames(names);
  const hints=[...new Set(eligible.map((s:any)=>String(s.subjectHint||'').trim()).filter(Boolean).map((x:string)=>norm(x)))];
  if(hints.length===1){
   const original=eligible.find((s:any)=>norm(s.subjectHint)===hints[0])?.subjectHint||'';
   const hit=closestSubject(subjectCatalog,original);
   if(hit){setSubject(hit.id);setNewSubject('')}else{setSubject('__new__');setNewSubject(original)}
  }else if(subjectCatalog.length===1){setSubject(subjectCatalog[0].id);setNewSubject('')}
  else{setSubject('');setNewSubject('')}
 }

 async function upload(file?:File){
  if(!file)return;setBusy(true);setError('');
  try{
   if(file.size>8*1024*1024)throw new Error('File terlalu besar. Maksimal 8 MB.');
   const dataUrl=await new Promise<string>((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result||''));fr.onerror=()=>reject(new Error('Browser belum dapat membaca file Excel ini.'));fr.readAsDataURL(file)});
   const r=await fetch('/api/impor/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,fileName:file.name,dataUrl})});
   const j=await r.json().catch(()=>({message:'Server mengembalikan respons '+r.status+'.'}));
   if(!r.ok)throw new Error(j.message||('Excel gagal dibaca ('+r.status+').'));
   const idx=Number(j.suggestedSheetIndex||0);if(!j.sheets?.[idx])throw new Error('Excel terbaca tetapi tidak ditemukan tabel data.');
   setBook(j);setSource(j.sourceName);setSheetIndex(idx);initSheet(j.sheets[idx]);
   const useMulti=kind==='nilai'&&!!j.workbook?.multiClassSuggested;setMultiMode(useMulti);if(useMulti)initMulti(j);
   setStep(2);
  }catch(e:any){setError(e.message||'Excel belum dapat dibaca.')}finally{setBusy(false)}
 }
 function changeSheet(i:number){setSheetIndex(i);initSheet(book.sheets[i]);setValidation(null);setMultiMode(false)}

 function singlePayload(action:string){
  if(kind==='siswa')return{action,sourceName:source,rows,mapping,strategy,acceptNameMatches:acceptNames,applyDetectedClass,class_id:data.profile?.active_class_id};
  return{action,sourceName:source,rows,identity:mapping,subject_id:subject==='__new__'?'':subject,subject_name:subject==='__new__'?newSubject:'',semester,assessments:selectedAssessments,conflictStrategy:conflict,acceptNameMatches:acceptNames,overwriteKeys:overwrite,class_id:data.profile?.active_class_id};
 }
 function workbookPayload(action:string){
  return{
   action,sourceName:source,academic_year:data.profile?.academic_year,
   subject_id:subject==='__new__'?'':subject,subject_name:subject==='__new__'?newSubject:'',
   semester,conflictStrategy:conflict,
   sheets:multiSheets.map((s:any)=>({
    name:s.name,className:classNames[s.name]||s.classHint||s.name,rows:s.rows,
    identity:{
     nisn:s.suggestions?.nisn||fallbackGuess(s.headers||[],'nisn'),
     nis:s.suggestions?.nis||fallbackGuess(s.headers||[],'nis'),
     name:s.suggestions?.name||fallbackGuess(s.headers||[],'name')
    },
    assessments:withDates(s.scoreColumns||[])
   }))
  };
 }
 function payload(action:string){return multiMode&&kind==='nilai'?workbookPayload(action):singlePayload(action)}

 async function validate(){
  if(multiMode&&kind==='nilai'){
   if(multiSheets.length<2)return setError('Belum ditemukan minimal dua sheet kelas yang dapat diimpor bersama.');
   if(subject==='__new__'&&!newSubject.trim())return setError('Isi nama mata pelajaran untuk workbook ini.');
   if(!subject)return setError('Pilih mata pelajaran untuk workbook ini.');
   if(Object.values(classNames).some(x=>!String(x).trim()))return setError('Nama kelas tidak boleh kosong.');
  }else{
   if(kind==='siswa'&&!mapping.name)return setError('KelasKita belum menemukan kolom nama. Pilih kolom yang berisi nama siswa.');
   if(kind==='nilai'&&!mapping.name&&!mapping.nis&&!mapping.nisn)return setError('Pilih minimal satu identitas siswa: Nama, NIS, atau NISN.');
   if(kind==='nilai'&&subject==='__new__'&&!newSubject.trim())return setError('Isi nama mata pelajaran yang akan dibuat.');
   if(kind==='nilai'&&!subject)return setError('Pilih mata pelajaran.');
   if(kind==='nilai'&&!selectedAssessments.length)return setError('Belum ada kolom nilai yang dipilih.');
  }
  setBusy(true);setError('');
  try{
   const endpoint=multiMode&&kind==='nilai'?'/api/impor/workbook':kind==='siswa'?'/api/impor/siswa':'/api/impor/nilai';
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload('validate'))});
   const j=await r.json();if(!r.ok)throw new Error(j.message);setValidation(j);setOverwrite(j.conflicts?.map((x:any)=>x.key)||[]);setStep(3);
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function commit(){
  setBusy(true);setError('');
  try{
   const endpoint=multiMode&&kind==='nilai'?'/api/impor/workbook':kind==='siswa'?'/api/impor/siswa':'/api/impor/nilai';
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload('commit'))});
   const j=await r.json();if(!r.ok)throw new Error(j.message);setResult(j);setStep(4);onDone();
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 return <div className="modal-backdrop import-backdrop"><div className="modal modal-wide import-modal">
  <div className="modal-head"><div><span className="eyebrow">IMPOR CERDAS · LANGKAH {step}/4</span><h2>{kind==='siswa'?'Impor Data Siswa':'Impor Rekap Nilai Excel'}</h2><p>{multiMode?'KelasKita membaca seluruh workbook sebagai beberapa kelas sekaligus.':kind==='siswa'?'Tidak harus mengikuti template persis. KelasKita mencari data siswa yang dikenali.':'KelasKita membaca siswa, mata pelajaran, dan kolom nilai secara adaptif.'}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
  <div className="import-steps">{['Baca Excel','Pemetaan','Validasi','Selesai'].map((x,i)=><span key={x} className={step>=i+1?'on':''}>{i+1}<b>{x}</b></span>)}</div>
  {error&&<div className="import-error"><AlertTriangle size={16}/>{error}</div>}

  {step===1&&<div className="import-upload">
   <UploadCloud size={34}/><h3>Upload Excel yang sudah Anda punya</h3>
   <p>Judul di atas tabel, kolom tambahan, urutan berbeda, maupun banyak sheet tetap akan dianalisis. Workbook beberapa kelas dapat diimpor sekaligus.</p>
   <label className="btn btn-primary">Pilih File Excel<input hidden type="file" accept=".xlsx,.xlsm" onChange={e=>upload(e.target.files?.[0])}/></label>
   <a className="btn btn-ghost" href={kind==='siswa'?'/api/siswa/import':'/api/impor/nilai/template'}><Download size={16}/>Template opsional</a>
  </div>}

  {step===2&&sheet&&<div className="import-body">
   <div className="import-smart-note"><Sparkles size={17}/><div><b>Smart Excel Reader aktif</b><small>{multiMode?'Beberapa sheet kelas terdeteksi dan akan diproses bersama.':'KelasKita mencoba memetakan kolom otomatis. Anda tetap bisa mengoreksinya.'}</small></div></div>

   {kind==='nilai'&&multiSheets.length>=2&&<div className="import-mode-switch"><button className={multiMode?'active':''} onClick={()=>{setMultiMode(true);initMulti(book);setValidation(null)}}><Layers3 size={16}/>Impor semua kelas</button><button className={!multiMode?'active':''} onClick={()=>{setMultiMode(false);initSheet(sheet);setValidation(null)}}><FileSpreadsheet size={16}/>Hanya satu sheet</button></div>}

   {multiMode&&kind==='nilai'?<>
    <div className="workbook-summary">
     <div><b>{source}</b><small>{multiSheets.length} kelas · {book.workbook?.totalRows||0} baris · {book.workbook?.totalValues||0} sel nilai terisi</small></div>
     <span className="badge badge-info">Multi-kelas</span>
    </div>
    <div className="import-settings">
     <label className="field"><span>Mata Pelajaran *</span><select className="input" value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{(subjectCatalog).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}<option value="__new__">+ Buat mata pelajaran baru</option></select></label>
     <label className="field"><span>Semester *</span><select className="input" value={semester} onChange={e=>setSemester(e.target.value)}><option>Ganjil</option><option>Genap</option></select></label>
    </div>
    {subject==='__new__'&&<label className="field"><span>Nama Mata Pelajaran Baru</span><input className="input" value={newSubject} onChange={e=>setNewSubject(e.target.value)} placeholder="Contoh: Matematika"/></label>}
    <div className="class-detect-grid">{multiSheets.map((s:any)=><section className="class-detect-card" key={s.name}><div><small>SHEET {s.name}</small><input className="input" value={classNames[s.name]||''} onChange={e=>setClassNames(v=>({...v,[s.name]:e.target.value}))}/></div><b>{s.rows.length} baris siswa</b><p>{(s.scoreColumns||[]).map((x:any)=>x.name).join(' · ')||'Belum ada nilai terdeteksi'}</p></section>)}</div>
    <div className="detected-strip"><span>Prinsip pencocokan</span><b>NISN → NIS → Nama + Kelas</b><small>Nama sama di kelas berbeda tidak digabung otomatis.</small></div>
   </>:<>
    <div className="import-source"><FileSpreadsheet size={20}/><div><b>{source}</b><small>{rows.length} baris · header baris {sheet.headerRow} · sheet “{sheet.name}”</small></div>{book.sheets.length>1&&<select className="input" value={sheetIndex} onChange={e=>changeSheet(Number(e.target.value))}>{book.sheets.map((s:any,i:number)=><option value={i} key={s.name}>{s.name}{i===0?' · paling cocok':''}</option>)}</select>}</div>
    {kind==='siswa'?<>
     {sheet.classHint&&<div className="detected-strip"><span>Terdeteksi kelas</span><b>{sheet.classHint}</b><label><input type="checkbox" checked={applyDetectedClass} onChange={e=>setApplyDetectedClass(e.target.checked)}/> gunakan sebagai petunjuk kelas</label></div>}
     <div className="mapping-grid">{studentFields.map(([k,label])=><label className="field" key={k}><span>{label}{k==='name'?' *':''}</span><select className="input" value={mapping[k]||''} onChange={e=>setMapping((m:any)=>({...m,[k]:e.target.value}))}><option value="">Tidak ditemukan / tidak dipakai</option>{headers.map((h:string)=><option key={h}>{h}</option>)}</select></label>)}</div>
    </>:<>
     {sheet.subjectHint&&<div className="detected-strip"><span>Petunjuk mata pelajaran</span><b>{sheet.subjectHint}</b></div>}
     <div className="import-settings"><label className="field"><span>Mata Pelajaran *</span><select className="input" value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{(subjectCatalog).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}<option value="__new__">+ Buat mata pelajaran baru</option></select></label><label className="field"><span>Semester *</span><select className="input" value={semester} onChange={e=>setSemester(e.target.value)}><option>Ganjil</option><option>Genap</option></select></label></div>
     {subject==='__new__'&&<label className="field"><span>Nama Mata Pelajaran Baru</span><input className="input" value={newSubject} onChange={e=>setNewSubject(e.target.value)}/></label>}
     <div className="mapping-grid identity-map">{[['nisn','NISN'],['nis','NIS'],['name','Nama Siswa']].map(([k,l])=><label className="field" key={k}><span>{l}</span><select className="input" value={mapping[k]||''} onChange={e=>setMapping((m:any)=>({...m,[k]:e.target.value}))}><option value="">Tidak ditemukan / tidak dipakai</option>{headers.map((h:string)=><option key={h}>{h}</option>)}</select></label>)}</div>
     <div className="assessment-map"><div className="card-head"><div><h3>Nilai yang terdeteksi</h3><p className="subtle">Kolom nilai dapat diaktifkan, diberi nama, dan dikategorikan sebelum impor.</p></div><span className="badge badge-info">{selectedAssessments.length} dipilih</span></div>{assessments.map((a:any,i:number)=><div className="assessment-map-row" key={a.column}><input type="checkbox" checked={a.include} onChange={e=>setAssessments(v=>v.map((x:any,j:number)=>j===i?{...x,include:e.target.checked}:x))}/><div><small>Kolom Excel</small><b>{a.column}</b></div><input className="input" value={a.name} onChange={e=>setAssessments(v=>v.map((x:any,j:number)=>j===i?{...x,name:e.target.value}:x))}/><select className="input" value={a.category} onChange={e=>setAssessments(v=>v.map((x:any,j:number)=>j===i?{...x,category:e.target.value}:x))}>{categories.map(c=><option key={c}>{c}</option>)}</select><input className="input" type="date" value={a.date} onChange={e=>setAssessments(v=>v.map((x:any,j:number)=>j===i?{...x,date:e.target.value}:x))}/><input className="input" type="number" min="1" value={a.maxScore} onChange={e=>setAssessments(v=>v.map((x:any,j:number)=>j===i?{...x,maxScore:Number(e.target.value)}:x))}/></div>)}</div>
    </>}
    <div className="import-preview"><b>Preview data yang terbaca</b><div className="table-wrap"><table className="table"><thead><tr>{headers.slice(0,10).map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,7).map((r:any,i:number)=><tr key={i}>{headers.slice(0,10).map((h:string)=><td key={h}>{String(r[h]??'')}</td>)}</tr>)}</tbody></table></div></div>
   </>}
  </div>}

  {step===3&&validation&&<div className="import-review">
   {multiMode&&kind==='nilai'?<>
    <div className="import-stat-grid"><Metric label="Kelas" value={validation.stats.classes}/><Metric label="Baris siswa" value={validation.stats.studentRows}/><Metric label="Nilai terbaca" value={validation.stats.values}/><Metric label="Penilaian baru" value={validation.stats.newAssessments}/></div>
    <div className="grid-2"><section className="card"><h3>Yang akan dibuat/dicocokkan</h3><p className="subtle">{validation.stats.newClasses} kelas baru · {validation.stats.newStudents} siswa baru · {validation.stats.matchedStudents} siswa cocok.</p>{(validation.sheets||[]).map((x:any)=><div className="mini-line" key={x.sheet}><b>{x.className}</b><small>{x.rows} siswa · {x.values} nilai · {x.assessments} penilaian</small></div>)}</section><section className="card"><h3>Jika nilai sudah ada</h3><div className="conflict-options"><button className={conflict==='keep'?'active':''} onClick={()=>setConflict('keep')}>Pertahankan lama</button><button className={conflict==='overwrite'?'active':''} onClick={()=>setConflict('overwrite')}>Ganti dengan Excel</button></div><p className="subtle">{validation.stats.conflicts} konflik nilai terdeteksi.</p></section></div>
    {validation.crossClassDuplicates?.length>0&&<div className="import-warning"><AlertTriangle size={16}/><div><b>{validation.crossClassDuplicates.length} nama muncul di lebih dari satu kelas.</b><span>Nama tersebut tidak akan digabung hanya berdasarkan nama. Contoh: {validation.crossClassDuplicates.slice(0,3).map((x:any)=>x.name+' ('+x.classes.join(', ')+')').join(' · ')}</span></div></div>}
   </>:<>
    <div className="import-stat-grid">{kind==='siswa'?<><Metric label="Baris siswa" value={validation.stats.total}/><Metric label="Siswa baru" value={validation.stats.new}/><Metric label="Cocok NIS/NISN" value={validation.stats.exact}/><Metric label="Cocok nama" value={validation.stats.nameReview}/></>:<><Metric label="Siswa cocok" value={validation.stats.matched}/><Metric label="Nilai terbaca" value={validation.stats.values}/><Metric label="Penilaian baru" value={validation.stats.newAssessments}/><Metric label="Konflik nilai" value={validation.stats.conflicts}/></>}</div>
    {kind==='siswa'?<div className="grid-2"><section className="card"><h3>Jika siswa sudah ada</h3><label className="radio-line"><input type="radio" checked={strategy==='merge'} onChange={()=>setStrategy('merge')}/> Lengkapi/perbarui dari Excel</label><label className="radio-line"><input type="radio" checked={strategy==='skip'} onChange={()=>setStrategy('skip')}/> Pertahankan data KelasKita</label></section><section className="card"><h3>Pencocokan nama</h3><label className="switch-line"><input type="checkbox" checked={acceptNames} onChange={e=>setAcceptNames(e.target.checked)}/> Gunakan kecocokan nama unik dalam kelas aktif</label></section></div>:<section className="card"><h3>Jika nilai sudah ada</h3><div className="conflict-options"><button className={conflict==='keep'?'active':''} onClick={()=>setConflict('keep')}>Pertahankan nilai lama</button><button className={conflict==='overwrite'?'active':''} onClick={()=>setConflict('overwrite')}>Ganti dengan Excel</button></div></section>}
   </>}
  </div>}

  {step===4&&result&&<div className="import-done"><CheckCircle2 size={42}/><h3>Impor selesai</h3>{multiMode&&kind==='nilai'?<p><b>{result.classes}</b> kelas diproses, <b>{result.studentRows}</b> baris siswa, dan <b>{result.values}</b> nilai dibaca untuk {result.subject_name}.</p>:kind==='siswa'?<p><b>{result.inserted}</b> siswa baru ditambahkan, <b>{result.updated}</b> diperbarui, dan <b>{result.skipped}</b> dilewati.</p>:<p><b>{result.imported}</b> nilai masuk, <b>{result.createdAssessments}</b> penilaian dibuat, dan <b>{result.kept}</b> nilai lama dipertahankan.</p>}<p className="subtle">Data langsung tersimpan pada ruang kelas masing-masing dan dapat dilanjutkan dari perangkat lain.</p></div>}

  <div className="modal-actions import-actions">
   {step>1&&step<4&&<button className="btn btn-ghost" onClick={()=>setStep(step-1)} disabled={busy}><ArrowLeft size={16}/>Kembali</button>}
   {step===2&&<button className="btn btn-primary" onClick={validate} disabled={busy}>{busy?'Menganalisis…':'Validasi Data'} <ArrowRight size={16}/></button>}
   {step===3&&<button className="btn btn-primary" onClick={commit} disabled={busy}>{busy?'Mengimpor…':multiMode?'Impor Semua Kelas':'Impor ke KelasKita'} <ArrowRight size={16}/></button>}
   {step===4&&<button className="btn btn-primary" onClick={onClose}>Selesai</button>}
  </div>
 </div></div>
}
function Metric({label,value}:{label:string;value:any}){return <div className="import-metric"><span>{label}</span><b>{value}</b></div>}
