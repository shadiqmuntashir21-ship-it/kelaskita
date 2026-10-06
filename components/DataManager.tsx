'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Download,RefreshCcw,ShieldCheck} from 'lucide-react';

function currentMonth(){
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthCount(start:string,end:string){
 if(!/^\d{4}-\d{2}$/.test(start)||!/^\d{4}-\d{2}$/.test(end))return 0;
 const [sy,sm]=start.split('-').map(Number),[ey,em]=end.split('-').map(Number);
 return (ey*12+em)-(sy*12+sm)+1;
}

export default function DataManager({data,onChange}:{data:any;onChange:()=>void|Promise<void>}){
 const classId=data.profile?.active_class_id||'';
 const now=currentMonth();
 const[counts,setCounts]=useState<any>(null),[confirmation,setConfirmation]=useState(''),[typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const[backupScope,setBackupScope]=useState<'period'|'all'>('period'),[startMonth,setStartMonth]=useState(now),[endMonth,setEndMonth]=useState(now);
 const months=useMemo(()=>monthCount(startMonth,endMonth),[startMonth,endMonth]);
 const periodValid=backupScope==='all'||(months>=1&&months<=12);

 async function load(){
  if(!classId)return;setError('');
  try{
   const r=await fetch('/api/manajemen-data?class_id='+encodeURIComponent(classId),{cache:'no-store'});
   const j=await r.json();if(!r.ok)throw new Error(j.message);setCounts(j.counts);setConfirmation(j.confirmation||'');
  }catch(e:any){setError(e.message||'Informasi data belum dapat dimuat.')}
 }
 useEffect(()=>{setTyped('');load()},[classId]);

 function backupUrl(){
  const q=new URLSearchParams({class_id:classId,backup:'1',scope:backupScope});
  if(backupScope==='period'){q.set('start_month',startMonth);q.set('end_month',endMonth)}
  return '/api/manajemen-data?'+q.toString();
 }
 function downloadBackup(){
  if(!classId)return;
  if(!periodValid){setError(months<1?'Bulan akhir tidak boleh sebelum bulan awal.':'Satu file cadangan maksimal mencakup 12 bulan.');return}
  setError('');window.location.href=backupUrl();
 }
 async function reset(){
  if(!confirmation||typed!==confirmation)return;
  if(!confirm('Kosongkan data operasional kelas ini? Lisensi dan akun tetap dipertahankan.'))return;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/manajemen-data',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({class_id:classId,confirm:typed})});
   const j=await r.json();if(!r.ok)throw new Error(j.message);
   setTyped('');await onChange();await load();
  }catch(e:any){setError(e.message||'Reset dibatalkan.')}finally{setBusy(false)}
 }
 const total=counts?Object.values(counts).reduce((a:any,b:any)=>Number(a)+Number(b),0):0;

 return <section className="card data-manager">
  <div className="card-head"><div><h3>Cadangan & Reset Data Kelas</h3><p className="subtle">Kelola isi kelas aktif tanpa menghapus lisensi, PIN, pembayaran, transaksi, atau perangkat.</p></div><span className="badge badge-good"><ShieldCheck size={13}/> Aman</span></div>
  {error&&<div className="import-error">{error}</div>}
  <div className="data-safety-note"><AlertTriangle size={17}/><div><b>Semua tindakan dibatasi ke kelas aktif: {data.profile?.class_name||'—'}</b><small>Sebelum menghapus data lama, unduh cadangan terlebih dahulu. Data kelas lain pada lisensi yang sama tidak disentuh.</small></div></div>
  <div className="data-count-grid">
   <Count label="Siswa" value={counts?.students}/><Count label="Kehadiran Harian" value={counts?.attendance}/><Count label="Kehadiran Mapel" value={counts?.subjectAttendance}/><Count label="Nilai" value={counts?.scores}/><Count label="Penilaian" value={counts?.assessments}/><Count label="Catatan" value={counts?.notes}/><Count label="Prestasi" value={counts?.achievements}/><Count label="Agenda" value={counts?.agendas}/>
  </div>

  <div className="backup-period">
   <div className="backup-period-head"><div><b>Unduh Cadangan</b><small>Guru menentukan sendiri rentangnya. Bisa 1 bulan, 5 bulan, 6 bulan, atau sesuai lama semester di sekolah.</small></div></div>
   <div className="backup-scope">
    <button type="button" className={backupScope==='period'?'active':''} onClick={()=>setBackupScope('period')}>Rentang Bulan</button>
    <button type="button" className={backupScope==='all'?'active':''} onClick={()=>setBackupScope('all')}>Seluruh Data Kelas</button>
   </div>
   {backupScope==='period'&&<div className="backup-period-grid">
    <label><span>Bulan awal</span><input className="input" type="month" value={startMonth} onChange={e=>setStartMonth(e.target.value)}/></label>
    <label><span>Bulan akhir</span><input className="input" type="month" value={endMonth} onChange={e=>setEndMonth(e.target.value)}/></label>
    <div className={'backup-period-summary '+(periodValid?'ok':'warn')}><small>Rentang cadangan</small><b>{months>0?`${months} bulan`:'Periksa periode'}</b></div>
   </div>}
   <button type="button" className="btn btn-soft" disabled={!periodValid||!classId} onClick={downloadBackup}><Download size={15}/>Unduh Cadangan JSON</button>
   <p className="subtle backup-note">Cadangan hanya diunduh ke perangkat guru dan tidak disalin lagi sebagai file besar di database KelasKita.</p>
  </div>

  <div className="data-manager-actions">
   <div className="reset-zone">
    <small>Untuk mengosongkan seluruh data operasional kelas, ketik:</small><code>{confirmation||'Memuat konfirmasi…'}</code>
    <div><input className="input" value={typed} onChange={e=>setTyped(e.target.value)} placeholder={confirmation}/><button className="btn btn-danger" disabled={busy||!confirmation||typed!==confirmation} onClick={reset}><RefreshCcw size={15}/>{busy?'Mengosongkan…':'Kosongkan Kelas'}</button></div>
   </div>
  </div>
  <p className="subtle" style={{marginTop:10}}>Total {Number(total)||0} item operasional terdeteksi pada kelas ini. Reset tidak menyentuh lisensi atau transaksi.</p>
 </section>
}
function Count({label,value}:{label:string;value:any}){return <div className="data-count"><span>{label}</span><b>{Number(value||0)}</b></div>}
