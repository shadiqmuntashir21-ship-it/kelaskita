'use client';

import {useEffect,useMemo,useState} from 'react';
import {Check,Search,Trash2} from 'lucide-react';

type Filter='all'|'filled'|'empty'|'pass'|'fail';
function val(v:any){return v===null||v===undefined?'':String(v)}
function same(a:any,b:any){return String(a??'')===String(b??'')}

export default function ScoreManager({
 assessment,students,scores,subject,onClose,onSaved,onMessage
}:{assessment:any;students:any[];scores:any[];subject:any;onClose:()=>void;onSaved:()=>void|Promise<void>;onMessage:(x:string)=>void}){
 const original=useMemo(()=>new Map(scores.filter((x:any)=>x.assessment_id===assessment.id).map((x:any)=>[x.student_id,x])),[scores,assessment.id]);
 const[draft,setDraft]=useState<Record<string,{score:string;remedial:string;note:string;deleted?:boolean}>>({});
 const[filter,setFilter]=useState<Filter>('all'),[search,setSearch]=useState(''),[busy,setBusy]=useState(false);

 function resetDraft(){
  const d:any={};
  students.forEach((st:any)=>{const x:any=original.get(st.id);d[st.id]={score:val(x?.score),remedial:val(x?.remedial_score),note:x?.note||'',deleted:false}});
  setDraft(d);
 }
 useEffect(()=>{resetDraft()},[assessment.id,students.length,scores.length]);

 function effectiveScore(st:any){
  const d=draft[st.id];if(!d||d.deleted)return null;
  const v=d.remedial!==''?Number(d.remedial):d.score!==''?Number(d.score):null;
  return Number.isFinite(v as number)?v:null;
 }
 function changed(st:any){
  const d=draft[st.id];if(!d)return false;const o:any=original.get(st.id);
  if(d.deleted)return !!o;
  return !same(d.score,o?.score)||!same(d.remedial,o?.remedial_score)||!same(d.note,o?.note||'');
 }
 const changedCount=students.filter(changed).length;
 const rows=students.filter((st:any)=>{
  if(search&&!String(st.name||'').toLowerCase().includes(search.toLowerCase()))return false;
  const d=draft[st.id],has=!!d&&!d.deleted&&(d.score!==''||d.remedial!=='');
  const score=effectiveScore(st),max=Math.max(1,Number(assessment.max_score||100)),pct=score===null?null:score/max*100,limit=Number(subject?.mastery_score||75);
  if(filter==='filled')return has;if(filter==='empty')return !has;if(filter==='pass')return pct!==null&&pct>=limit;if(filter==='fail')return pct!==null&&pct<limit;return true;
 });
 const filled=students.filter((st:any)=>{const d=draft[st.id];return !!d&&!d.deleted&&(d.score!==''||d.remedial!=='')}).length;

 function update(id:string,key:'score'|'remedial'|'note',value:string){setDraft(d=>({...d,[id]:{...(d[id]||{score:'',remedial:'',note:''}),[key]:value,deleted:false}}))}
 function toggleDelete(id:string){setDraft(d=>({...d,[id]:{...(d[id]||{score:'',remedial:'',note:''}),deleted:!d[id]?.deleted}}))}
 async function save(){
  const changes=students.filter(changed).map((st:any)=>{
    const d=draft[st.id];return{student_id:st.id,score:d.deleted?null:(d.score===''?null:Number(d.score)),remedial_score:d.deleted?null:(d.remedial===''?null:Number(d.remedial)),note:d.deleted?'':d.note||'',delete:!!d.deleted}
  });
  if(!changes.length)return onMessage('Belum ada perubahan nilai.');
  setBusy(true);
  try{
   const r=await fetch('/api/nilai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessment_id:assessment.id,scores:changes})});
   const j=await r.json();if(!r.ok)throw new Error(j.message||'Nilai belum berhasil disimpan.');
   onMessage('Nilai diperbarui · '+String(j.updated||0)+' disimpan · '+String(j.deleted||0)+' dihapus');
   await onSaved();onClose();
  }catch(e:any){onMessage(e.message||'Nilai belum berhasil disimpan.')}finally{setBusy(false)}
 }

 return <div className="score-manager">
  <div className="score-overview">
   <div><small>Total siswa</small><b>{students.length}</b></div><div><small>Sudah dinilai</small><b>{filled}</b></div><div><small>Belum dinilai</small><b>{students.length-filled}</b></div><div><small>Batas tuntas</small><b>{subject?.mastery_score||75}</b></div>
  </div>
  <div className="score-toolbar">
   <div className="score-filters">{([['all','Semua'],['filled','Sudah Dinilai'],['empty','Belum Dinilai'],['pass','Tuntas'],['fail','Belum Tuntas']] as any[]).map(([k,l])=><button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{l}</button>)}</div>
   <label className="score-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari siswa"/></label>
  </div>
  <div className="score-change-strip"><span>{changedCount?String(changedCount)+' perubahan belum disimpan':'Semua perubahan sudah tersimpan'}</span><small>Kosong = Belum Dinilai. Nilai 0 tetap dianggap nilai 0.</small></div>
  <div className="score-table score-table-v6">
   <div className="score-head"><span>Siswa</span><span>Nilai</span><span>Remedial</span><span>Catatan</span><span>Aksi</span></div>
   {rows.map((st:any)=>{const d=draft[st.id]||{score:'',remedial:'',note:''},o:any=original.get(st.id),hasOriginal=!!o;return <div className={'score-row '+(d.deleted?'score-deleted ':'')+(changed(st)?'score-changed':'')} key={st.id}><div><b>{st.name}</b><small>{d.deleted?'Nilai akan dihapus':hasOriginal?'Nilai tersimpan':'Belum dinilai'}</small></div><input className="input" type="number" min="0" max={assessment.max_score} value={d.deleted?'':d.score} disabled={d.deleted} onChange={e=>update(st.id,'score',e.target.value)}/><input className="input" type="number" min="0" max={assessment.max_score} value={d.deleted?'':d.remedial} disabled={d.deleted} onChange={e=>update(st.id,'remedial',e.target.value)}/><input className="input" value={d.deleted?'':d.note} disabled={d.deleted} onChange={e=>update(st.id,'note',e.target.value)}/><button className={'icon-btn '+(d.deleted?'restore':'danger')} title={d.deleted?'Batalkan hapus':'Hapus nilai siswa'} onClick={()=>toggleDelete(st.id)}><Trash2 size={15}/></button></div>})}
   {!rows.length&&<div className="empty compact">Tidak ada siswa pada filter ini.</div>}
  </div>
  <div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Batal</button><button className="btn btn-primary" onClick={save} disabled={busy||!changedCount}><Check size={16}/>{busy?'Menyimpan...':'Simpan '+String(changedCount)+' Perubahan'}</button></div>
 </div>
}
