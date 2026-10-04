'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, LoaderCircle } from 'lucide-react';

export default function LoginForm(){
  const router=useRouter(); const [code,setCode]=useState(''); const [pin,setPin]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);try{const r=await fetch('/api/masuk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,pin})});const j=await r.json();if(!r.ok)throw new Error(j.message||'Tidak dapat masuk');router.push('/aplikasi');router.refresh()}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  return <form className="auth-card" onSubmit={submit}>
    <span className="pill"><KeyRound size={14}/> Akses berlisensi</span><h2>Masuk ke KelasKita</h2><p className="hint">Gunakan kode lisensi dan PIN yang diberikan kepada Anda.</p>
    {error&&<div className="error">{error}</div>}
    <div className="field"><label>Kode Lisensi</label><input className="input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Contoh: KK-AB12-CD34" autoComplete="username"/></div>
    <div className="field"><label>PIN</label><input className="input" type="password" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Masukkan PIN" autoComplete="current-password"/></div>
    <button className="btn btn-primary" style={{width:'100%',marginTop:8}} disabled={loading}>{loading?<><LoaderCircle size={17} className="spin"/>Memeriksa...</>:'Masuk ke KelasKita'}</button>
    <div style={{height:1,background:'#edf0f5',margin:'23px 0'}}/>
    <Link className="btn btn-ghost" style={{width:'100%'}} href="/demo">Belum punya lisensi? Coba Demo</Link>
  </form>
}
