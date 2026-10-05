'use client';
import {useEffect,useState} from 'react';
import {Laptop,RefreshCcw,ShieldCheck,Smartphone,Tablet,Trash2} from 'lucide-react';

function fmt(v:any){return v?new Date(v).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'-'}
function Icon({name}:{name:string}){const x=String(name||'').toLowerCase();if(/iphone|android|hp|phone/.test(x))return <Smartphone size={18}/>;if(/ipad|tablet/.test(x))return <Tablet size={18}/>;return <Laptop size={18}/>}

export default function DeviceManager(){
  const[data,setData]=useState<any>({devices:[],maxDevices:5}),[loading,setLoading]=useState(true),[msg,setMsg]=useState('');
  async function load(){setLoading(true);try{const r=await fetch('/api/perangkat',{cache:'no-store'}),j=await r.json();if(!r.ok)throw new Error(j.message);setData(j)}catch(e:any){setMsg(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  async function remove(d:any){
    if(!confirm(d.is_current?'Keluar dari perangkat ini? Anda perlu login kembali.':'Hapus akses perangkat ini?'))return;
    const r=await fetch('/api/perangkat',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:d.id})}),j=await r.json();
    if(!r.ok)return setMsg(j.message);
    if(j.current){location.href='/masuk';return}
    setMsg('Akses perangkat dicabut.');load();
  }
  async function others(){
    if(!confirm('Keluar dari semua perangkat lain? Perangkat ini tetap aktif.'))return;
    const r=await fetch('/api/perangkat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'revoke_others'})}),j=await r.json();
    if(!r.ok)return setMsg(j.message);
    setMsg('Semua perangkat lain sudah dikeluarkan.');load();
  }
  const active=(data.devices||[]).filter((d:any)=>d.is_active);
  return <section className="card device-manager">
    <div className="card-head"><div><h3>Perangkat Saya</h3><p className="subtle">Lisensi yang sama dapat dipakai di laptop, tablet, dan HP. Semua membaca data kelas yang sama dari cloud.</p></div><button className="icon-btn" onClick={load} title="Muat ulang"><RefreshCcw size={16}/></button></div>
    <div className="device-summary"><span><ShieldCheck size={17}/><b>{active.length}/{data.maxDevices||5}</b> perangkat aktif</span><small>Jika ganti perangkat, hapus perangkat lama untuk membebaskan slot.</small></div>
    {msg&&<div className="device-message">{msg}</div>}
    <div className="device-list">
      {loading&&<div className="empty">Memuat perangkat…</div>}
      {!loading&&active.map((d:any)=><div className="device-row" key={d.id}>
        <span className="device-icon"><Icon name={d.device_name}/></span>
        <div><b>{d.device_name||'Perangkat'}</b><small>{d.is_current?'Perangkat ini · ':''}Terakhir aktif {fmt(d.last_seen_at)}</small></div>
        {d.is_current&&<span className="badge badge-good">Saat ini</span>}
        <button className="icon-btn danger" onClick={()=>remove(d)} title="Cabut akses"><Trash2 size={15}/></button>
      </div>)}
      {!loading&&!active.length&&<div className="empty">Perangkat akan mulai tercatat setelah login berikutnya.</div>}
    </div>
    {active.length>1&&<div className="right-actions"><button className="btn btn-ghost btn-small danger" onClick={others}>Keluar dari perangkat lain</button></div>}
  </section>
}
