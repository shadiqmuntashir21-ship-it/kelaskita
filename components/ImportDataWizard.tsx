'use client';
import {useMemo,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,CheckCircle2,Download,FileSpreadsheet,Sparkles,UploadCloud,X} from 'lucide-react';

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
  return subjects.find(s=>norm(s.name)===h)||subjects.find(s=>h.includes(norm(s.name))||norm(s.name).includes(h))||null;
}

export default function ImportDataWizard({kind,data,onClose,onDone}:{kind:Kind;data:any;onClose:()=>void;onDone:()=>void}){
  const[step,setStep]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[source,setSource]=useState('');
  const[book,setBook]=useState<any>(null),[sheetIndex,setSheetIndex]=useState(0),[mapping,setMapping]=useState<any>({});
  const[subject,setSubject]=useState(data.subjects?.[0]?.id||''),[newSubject,setNewSubject]=useState(''),[semester,setSemester]=useState(data.academicSettings?.active_semester||'Ganjil');
  const[assessments,setAssessments]=useState<any[]>([]),[validation,setValidation]=useState<any>(null),[result,setResult]=useState<any>(null);
  const[strategy,setStrategy]=useState('merge'),[acceptNames,setAcceptNames]=useState(true),[conflict,setConflict]=useState('keep'),[overwrite,setOverwrite]=useState<string[]>([]);
  const[applyDetectedClass,setApplyDetectedClass]=useState(true);
  const sheet=book?.sheets?.[sheetIndex],headers=sheet?.headers||[],rows=sheet?.rows||[];
  const selectedAssessments=useMemo(()=>assessments.filter(x=>x.include),[assessments]);

  function initSheet(s:any){
    const suggestions=s?.suggestions||{};
    if(kind==='siswa'){
      const m:any={};studentFields.forEach(([k])=>m[k]=suggestions[k]||fallbackGuess(s.headers||[],k));setMapping(m);
      setApplyDetectedClass(!!(s.classHint||m.class_name));
    }else{
      const identity={
        nis:suggestions.nis||fallbackGuess(s.headers||[],'nis'),
        nisn:suggestions.nisn||fallbackGuess(s.headers||[],'nisn'),
        name:suggestions.name||fallbackGuess(s.headers||[],'name')
      };
      setMapping(identity);
      const cols=(s.scoreColumns||[]).map((x:any)=>({...x,date:new Date().toISOString().slice(0,10)}));
      setAssessments(cols);
      const hit=closestSubject(data.subjects||[],s.subjectHint||'');
      if(hit){setSubject(hit.id);setNewSubject('')}
      else if(s.subjectHint){setSubject('__new__');setNewSubject(s.subjectHint)}
      else {setSubject(data.subjects?.[0]?.id||'');setNewSubject('')}
    }
  }
  async function upload(file?:File){
    if(!file)return;setBusy(true);setError('');
    try{
      if(file.size>8*1024*1024)throw new Error('File terlalu besar. Maksimal 8 MB.');
      const dataUrl=await new Promise<string>((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result||''));fr.onerror=()=>reject(new Error('Browser belum dapat membaca file Excel ini.'));fr.readAsDataURL(file)});
      const r=await fetch('/api/impor/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,fileName:file.name,dataUrl})});
      const j=await r.json().catch(()=>({message:`Server mengembalikan respons ${r.status}.`}));
      if(!r.ok)throw new Error(j.message||`Excel gagal dibaca (${r.status}).`);
      const idx=Number(j.suggestedSheetIndex||0);
      if(!j.sheets?.[idx])throw new Error('Excel terbaca tetapi tidak ditemukan tabel data.');
      setBook(j);setSource(j.sourceName);setSheetIndex(idx);initSheet(j.sheets[idx]);setStep(2);
    }catch(e:any){setError(e.message||'Excel belum dapat dibaca.')}finally{setBusy(false)}
  }
  function changeSheet(i:number){setSheetIndex(i);initSheet(book.sheets[i]);setValidation(null)}
  function payload(action:string){
    if(kind==='siswa')return{action,sourceName:source,rows,mapping,strategy,acceptNameMatches:acceptNames,applyDetectedClass};
    return{
      action,sourceName:source,rows,identity:mapping,
      subject_id:subject==='__new__'?'':subject,subject_name:subject==='__new__'?newSubject:'',
      semester,assessments:selectedAssessments,conflictStrategy:conflict,acceptNameMatches:acceptNames,overwriteKeys:overwrite
    };
  }
  async function validate(){
    if(kind==='siswa'&&!mapping.name)return setError('KelasKita belum menemukan kolom nama. Pilih kolom yang berisi nama siswa.');
    if(kind==='nilai'&&!mapping.name&&!mapping.nis&&!mapping.nisn)return setError('Pilih minimal satu identitas siswa: Nama, NIS, atau NISN.');
    if(kind==='nilai'&&subject==='__new__'&&!newSubject.trim())return setError('Isi nama mata pelajaran yang akan dibuat.');
    if(kind==='nilai'&&!subject)return setError('Pilih mata pelajaran.');
    if(kind==='nilai'&&!selectedAssessments.length)return setError('Belum ada kolom nilai yang dipilih. Centang minimal satu kolom nilai.');
    setBusy(true);setError('');
    try{
      const r=await fetch(kind==='siswa'?'/api/impor/siswa':'/api/impor/nilai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload('validate'))});
      const j=await r.json();if(!r.ok)throw new Error(j.message);setValidation(j);setOverwrite(j.conflicts?.map((x:any)=>x.key)||[]);setStep(3);
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  async function commit(){
    setBusy(true);setError('');
    try{
      const r=await fetch(kind==='siswa'?'/api/impor/siswa':'/api/impor/nilai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload('commit'))});
      const j=await r.json();if(!r.ok)throw new Error(j.message);setResult(j);setStep(4);onDone();
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="modal-backdrop import-backdrop"><div className="modal modal-wide import-modal">
    <div className="modal-head"><div><span className="eyebrow">IMPOR CERDAS · LANGKAH {step}/4</span><h2>{kind==='siswa'?'Impor Data Siswa':'Impor Rekap Nilai Excel'}</h2><p>{kind==='siswa'?'Tidak harus mengikuti template persis. KelasKita mencari data yang dikenali dari Excel Anda.':'KelasKita mencari siswa, mata pelajaran, dan kolom nilai meskipun format Excel berbeda.'}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
    <div className="import-steps">{['Baca Excel','Pemetaan','Validasi','Selesai'].map((x,i)=><span key={x} className={step>=i+1?'on':''}>{i+1}<b>{x}</b></span>)}</div>
    {error&&<div className="import-error"><AlertTriangle size={16}/>{error}</div>}

    {step===1&&<div className="import-upload">
      <UploadCloud size={34}/><h3>Upload Excel yang sudah Anda punya</h3>
      <p>Tidak perlu mengubah urutan kolom. Judul di atas tabel, kolom tambahan, nama header berbeda, dan banyak sheet tetap akan dianalisis. Anda tetap mendapat preview sebelum data masuk.</p>
      <label className="btn btn-primary">Pilih File Excel<input hidden type="file" accept=".xlsx,.xlsm" onChange={e=>upload(e.target.files?.[0])}/></label>
      <a className="btn btn-ghost" href={kind==='siswa'?'/api/siswa/import':'/api/impor/nilai/template'}><Download size={16}/>Template opsional</a>
    </div>}

    {step===2&&sheet&&<div className="import-body">
      <div className="import-smart-note"><Sparkles size={17}/><div><b>Smart Excel Reader aktif</b><small>KelasKita memilih tabel yang paling mungkin berisi {kind==='siswa'?'data siswa':'rekap nilai'} dan mencoba memetakan kolom otomatis. Anda tetap bisa mengoreksinya.</small></div></div>
      <div className="import-source"><FileSpreadsheet size={20}/><div><b>{source}</b><small>{rows.length} baris · header terdeteksi di baris {sheet.headerRow} · sheet “{sheet.name}”</small></div>{book.sheets.length>1&&<select className="input" value={sheetIndex} onChange={e=>changeSheet(Number(e.target.value))}>{book.sheets.map((s:any,i:number)=><option value={i} key={s.name}>{s.name}{i===0?' · paling cocok':''}</option>)}</select>}</div>

      {kind==='siswa'?<>
        {sheet.classHint&&<div className="detected-strip"><span>Terdeteksi kelas</span><b>{sheet.classHint}</b><label><input type="checkbox" checked={applyDetectedClass} onChange={e=>setApplyDetectedClass(e.target.checked)}/> gunakan sebagai kelas aktif</label></div>}
        <div className="mapping-grid">{studentFields.map(([k,label])=><label className="field" key={k}><span>{label}{k==='name'?' *':''}</span><select className="input" value={mapping[k]||''} onChange={e=>setMapping((m:any)=>({...m,[k]:e.target.value}))}><option value="">Tidak ditemukan / tidak dipakai</option>{headers.map((h:string)=><option key={h}>{h}</option>)}</select></label>)}</div>
      </>:<>
        {sheet.subjectHint&&<div className="detected-strip"><span>Petunjuk mata pelajaran</span><b>{sheet.subjectHint}</b><small>diambil dari judul/sheet Excel</small></div>}
        <div className="import-settings">
          <label className="field"><span>Mata Pelajaran *</span><select className="input" value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Pilih mapel</option>{data.subjects.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}<option value="__new__">+ Buat mata pelajaran baru</option></select></label>
          <label className="field"><span>Semester *</span><select className="input" value={semester} onChange={e=>setSemester(e.target.value)}><option>Ganjil</option><option>Genap</option></select></label>
        </div>
        {subject==='__new__'&&<label className="field"><span>Nama Mata Pelajaran Baru</span><input className="input" value={newSubject} onChange={e=>setNewSubject(e.target.value)} placeholder="Contoh: Matematika"/></label>}
        <div className="mapping-grid identity-map">{[['nisn','NISN'],['nis','NIS'],['name','Nama Siswa']].map(([k,l])=><label className="field" key={k}><span>{l}</span><select className="input" value={mapping[k]||''} onChange={e=>setMapping((m:any)=>({...m,[k]:e.target.value}))}><option value="">Tidak ditemukan / tidak dipakai</option>{headers.map((h:string)=><option key={h}>{h}</option>)}</select></label>)}</div>
        <div className="assessment-map"><div className="card-head"><div><h3>Nilai yang terdeteksi</h3><p className="subtle">Tugas/TH, UH/Ulangan Harian, PTS/UTS, PAS/UAS, proyek, praktik, dan kolom angka lain yang menyerupai nilai akan ditawarkan di sini.</p></div><span className="badge badge-info">{selectedAssessments.length} dipilih</span></div>
          {assessments.length?assessments.map((a,i)=><div className="assessment-map-row" key={a.column}><input type="checkbox" checked={a.include} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,include:e.target.checked}:x))}/><div><small>Kolom Excel</small><b>{a.column}</b></div><input className="input" value={a.name} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><select className="input" value={a.category} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,category:e.target.value}:x))}>{categories.map(c=><option key={c}>{c}</option>)}</select><input className="input" type="date" value={a.date} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,date:e.target.value}:x))}/><input className="input" type="number" min="1" value={a.maxScore} onChange={e=>setAssessments(v=>v.map((x,j)=>j===i?{...x,maxScore:Number(e.target.value)}:x))}/></div>):<div className="empty">Belum ada kolom angka yang cukup meyakinkan sebagai nilai. Pilih sheet lain bila tersedia.</div>}
        </div>
      </>}

      <div className="import-preview"><b>Preview data yang benar-benar terbaca</b><div className="table-wrap"><table className="table"><thead><tr>{headers.slice(0,10).map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,7).map((r:any,i:number)=><tr key={i}>{headers.slice(0,10).map((h:string)=><td key={h}>{String(r[h]??'')}</td>)}</tr>)}</tbody></table></div></div>
    </div>}

    {step===3&&validation&&<div className="import-review">
      <div className="import-stat-grid">{kind==='siswa'?<>
        <Metric label="Baris siswa" value={validation.stats.total}/><Metric label="Siswa baru" value={validation.stats.new}/><Metric label="Cocok NIS/NISN" value={validation.stats.exact}/><Metric label="Cocok nama unik" value={validation.stats.nameReview}/>
      </>:<>
        <Metric label="Siswa cocok" value={validation.stats.matched}/><Metric label="Nilai terbaca" value={validation.stats.values}/><Metric label="Penilaian baru" value={validation.stats.newAssessments}/><Metric label="Konflik nilai" value={validation.stats.conflicts}/>
      </>}</div>
      {kind==='siswa'?<div className="grid-2"><section className="card"><h3>Jika siswa sudah ada</h3><label className="radio-line"><input type="radio" checked={strategy==='merge'} onChange={()=>setStrategy('merge')}/> Lengkapi/perbarui dari Excel</label><label className="radio-line"><input type="radio" checked={strategy==='skip'} onChange={()=>setStrategy('skip')}/> Pertahankan data KelasKita</label></section><section className="card"><h3>Pencocokan nama</h3><p className="subtle">{validation.stats.nameReview} siswa cocok melalui nama unik.</p><label className="switch-line"><input type="checkbox" checked={acceptNames} onChange={e=>setAcceptNames(e.target.checked)}/> Gunakan kecocokan nama unik</label><p className="subtle">Nama yang ambigu tetap dilewati agar tidak masuk ke siswa yang salah.</p></section></div>:<>
        <section className="card"><h3>Jika nilai sudah ada di KelasKita</h3><div className="conflict-options"><button className={conflict==='keep'?'active':''} onClick={()=>setConflict('keep')}>Pertahankan nilai lama</button><button className={conflict==='overwrite'?'active':''} onClick={()=>setConflict('overwrite')}>Ganti dengan Excel</button><button className={conflict==='review'?'active':''} onClick={()=>setConflict('review')}>Tinjau satu per satu</button></div><label className="switch-line"><input type="checkbox" checked={acceptNames} onChange={e=>setAcceptNames(e.target.checked)}/> Gunakan kecocokan nama siswa yang unik</label></section>
        {conflict==='review'&&validation.conflicts?.length>0&&<section className="card conflict-list"><div className="card-head"><h3>Konflik nilai</h3><span className="subtle">Centang untuk memakai nilai Excel.</span></div>{validation.conflicts.map((x:any)=><label key={x.key}><input type="checkbox" checked={overwrite.includes(x.key)} onChange={e=>setOverwrite(v=>e.target.checked?[...new Set([...v,x.key])]:v.filter(k=>k!==x.key))}/><span><b>{x.studentName}</b><small>{x.assessmentName}: KelasKita {x.existingScore} → Excel {x.newScore}</small></span></label>)}</section>}
      </>}
      {(validation.stats.ambiguous>0||validation.stats.unmatched>0)&&<div className="import-warning"><AlertTriangle size={16}/><span>{validation.stats.ambiguous||0} ambigu dan {validation.stats.unmatched||0} belum cocok akan dilewati, bukan dipaksakan ke siswa yang salah.</span></div>}
    </div>}

    {step===4&&result&&<div className="import-done"><CheckCircle2 size={42}/><h3>Impor selesai</h3>{kind==='siswa'?<p><b>{result.inserted}</b> siswa baru ditambahkan, <b>{result.updated}</b> diperbarui, dan <b>{result.skipped}</b> dilewati.{result.detectedClass?<> Kelas aktif: <b>{result.detectedClass}</b>.</>:null}</p>:<p><b>{result.imported}</b> nilai masuk, <b>{result.createdAssessments}</b> penilaian dibuat, dan <b>{result.kept}</b> nilai lama dipertahankan.</p>}<p className="subtle">Data langsung dipakai oleh Siswa 360°, akademik, remedial, peringatan, dan laporan.</p></div>}

    <div className="modal-actions import-actions">
      {step>1&&step<4&&<button className="btn btn-ghost" onClick={()=>setStep(step-1)} disabled={busy}><ArrowLeft size={16}/>Kembali</button>}
      {step===2&&<button className="btn btn-primary" onClick={validate} disabled={busy}>{busy?'Menganalisis…':'Validasi Data'} <ArrowRight size={16}/></button>}
      {step===3&&<button className="btn btn-primary" onClick={commit} disabled={busy}>{busy?'Mengimpor…':'Impor ke KelasKita'} <ArrowRight size={16}/></button>}
      {step===4&&<button className="btn btn-primary" onClick={onClose}>Selesai</button>}
    </div>
  </div></div>
}
function Metric({label,value}:{label:string;value:any}){return <div className="import-metric"><span>{label}</span><b>{value}</b></div>}
