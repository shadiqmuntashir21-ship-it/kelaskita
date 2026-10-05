'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,Download,RefreshCcw,ShieldCheck} from 'lucide-react';

export default function DataManager({data,onChange}:{data:any;onChange:()=>void|Promise<void>}){
 const classId=data.profile?.active_class_id||'';
 const[counts,setCounts]=useState<any>(null),[confirmation,setConfirmation]=useState(''),[typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){
  if(!classId)return;setError('');
  try{
   const r=await fetch('/api/manajemen-data?class_id='+encodeURIComponent(classId),{cache:'no-store'});
   const j=await r.json();if(!r.ok)throw new Error(j.message);setCounts(j.counts);setConfirmation(j.confirmation||'');
  }catch(e:any){setError(e.message||'Informasi data belum dapat dimuat.')}
 }
 useEffect(()=>{setTyped('');load()},[classId]);
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
  <div className="card-head"><div><h3>Cadangan & Reset Data Kelas</h3><p className="subtle">Kelola isi kelas aktif tanpa menghapus lisensi, PIN, pembayaran, atau perangkat.</p></div><span className="badge badge-good"><ShieldCheck size={13}/> Aman</span></div>
  {error&&<div className="import-error">{error}</div>}
  <div className="data-safety-note"><AlertTriangle size={17}/><div><b>Reset hanya untuk kelas aktif: {data.profile?.class_name||'—'}</b><small>Sebelum reset, unduh cadangan. Siswa yang masih aktif di kelas lain tidak akan dihapus dari akun guru.</small></div></div>
  <div className="data-count-grid">
   <Count label="Siswa" value={counts?.students}/><Count label="Kehadiran" value={counts?.attendance}/><Count label="Nilai" value={counts?.scores}/><Count label="Penilaian" value={counts?.assessments}/><Count label="Catatan" value={counts?.notes}/><Count label="Prestasi" value={counts?.achievements}/><Count label="Tindak Lanjut" value={counts?.followups}/><Count label="Agenda" value={counts?.agendas}/>
  </div>
  <div className="data-manager-actions">
   <a className="btn btn-soft" href={classId?'/api/manajemen-data?class_id='+encodeURIComponent(classId)+'&backup=1':'#'}><Download size={15}/>Unduh Cadangan JSON</a>
   <div className="reset-zone">
    <small>Untuk mengosongkan kelas, ketik:</small><code>{confirmation||'Memuat konfirmasi…'}</code>
    <div><input className="input" value={typed} onChange={e=>setTyped(e.target.value)} placeholder={confirmation}/><button className="btn btn-danger" disabled={busy||!confirmation||typed!==confirmation} onClick={reset}><RefreshCcw size={15}/>{busy?'Mengosongkan…':'Kosongkan Kelas'}</button></div>
   </div>
  </div>
  <p className="subtle" style={{marginTop:10}}>Total {Number(total)||0} item operasional terdeteksi pada kelas ini. Reset tidak menyentuh lisensi atau transaksi.</p>
 </section>
}
function Count({label,value}:{label:string;value:any}){return <div className="data-count"><span>{label}</span><b>{Number(value||0)}</b></div>}
