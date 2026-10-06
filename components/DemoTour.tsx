'use client';

import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,Compass,X} from 'lucide-react';

type DemoView='beranda'|'siswa'|'kehadiran'|'akademik'|'jadwal'|'catatan'|'prestasi'|'tindak'|'agenda'|'administrasi'|'laporan'|'pengaturan';

const steps=[
 {view:'beranda',selector:'.demo-banner',title:'Kenali Mode Demo',copy:'Mode Demo berisi data contoh yang sudah terisi. Semua perubahan di sini bersifat sementara dan tidak menyentuh data pengguna nyata.'},
 {view:'beranda',selector:'.welcome-panel',title:'Mulai dari pekerjaan penting',copy:'Beranda merangkum kondisi kelas dan membantu guru melihat hal yang perlu perhatian tanpa membuka banyak menu.'},
 {view:'beranda',selector:'.dashboard-grid .card',title:'Peringatan yang bisa ditindaklanjuti',copy:'KelasKita membawa siswa yang perlu perhatian ke depan agar guru tidak perlu mencari satu per satu.'},
 {view:'kehadiran',selector:'.attendance-workspace',title:'Kehadiran yang bisa dibuka kembali',copy:'Pilih tanggal, isi kehadiran, lalu buka lagi tanggal lama kapan pun jika perlu diperbaiki.'},
 {view:'akademik',selector:'.academic-import-toolbar',title:'Nilai tidak dimulai dari nol',copy:'Penilaian lama tetap menampilkan nilai yang sudah tersimpan. Guru cukup melengkapi atau mengubah bagian yang diperlukan.'},
 {view:'laporan',selector:'.report-toolbar',title:'Input sekali, rekap ikut tersusun',copy:'Laporan membantu guru mengambil rekap dari data yang sudah dikerjakan, tanpa mengetik ulang pekerjaan yang sama.'},
 {view:'beranda',selector:'.demo-banner',title:'Siap menjelajah sendiri',copy:'Sekarang Anda sudah mengenal alur utamanya. Silakan buka menu lain atau lanjut ke pembelian jika KelasKita sesuai kebutuhan Anda.'}
] as const;

export default function DemoTour({view,setView,restartToken=0}:{view:DemoView;setView:(v:DemoView)=>void;restartToken?:number}){
 const[offer,setOffer]=useState(true),[active,setActive]=useState(false),[index,setIndex]=useState(0);
 const step=steps[index];
 const reduceMotion=useMemo(()=>typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,[]);

 function clearHighlight(){document.querySelectorAll('.kk-tour-highlight').forEach(el=>el.classList.remove('kk-tour-highlight'))}
 function start(){setOffer(false);setIndex(0);setActive(true)}
 function stop(){clearHighlight();setActive(false)}
 function next(){if(index>=steps.length-1){stop();return}setIndex(i=>i+1)}
 function prev(){if(index<=0)return;setIndex(i=>i-1)}

 useEffect(()=>{if(restartToken>0){clearHighlight();setOffer(true);setActive(false);setIndex(0)}},[restartToken]);
 useEffect(()=>{
  if(!active)return;
  if(view!==step.view){setView(step.view as DemoView);return}
  const timer=window.setTimeout(()=>{
   clearHighlight();
   const el=document.querySelector(step.selector) as HTMLElement|null;
   if(el){el.classList.add('kk-tour-highlight');el.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center',inline:'nearest'})}
  },120);
  return()=>window.clearTimeout(timer);
 },[active,index,view,step.view,step.selector,reduceMotion,setView]);
 useEffect(()=>()=>clearHighlight(),[]);

 return <>
  {offer&&<div className="tour-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-offer-title">
   <div className="tour-offer">
    <span className="tour-icon"><Compass size={22}/></span>
    <button className="tour-close" onClick={()=>setOffer(false)} aria-label="Tutup tawaran tur"><X size={18}/></button>
    <span className="eyebrow">MODE DEMO</span>
    <h2 id="tour-offer-title">Ingin tur singkat untuk mengenal KelasKita?</h2>
    <p>Kami akan menunjukkan alur utama dalam beberapa langkah. Anda tetap bisa menjelajahi demo sendiri kapan saja.</p>
    <div className="tour-offer-actions">
     <button className="btn btn-primary" onClick={start}><Compass size={16}/>Mulai Tur</button>
     <button className="btn btn-ghost" onClick={()=>setOffer(false)}>Jelajahi Sendiri</button>
    </div>
   </div>
  </div>}
  {active&&<div className="tour-dock" role="dialog" aria-live="polite" aria-label="Tur KelasKita">
   <div className="tour-progress"><span style={{width:`${((index+1)/steps.length)*100}%`}}/></div>
   <div className="tour-dock-top"><span>{index+1} dari {steps.length}</span><button onClick={stop} aria-label="Akhiri tur"><X size={17}/></button></div>
   <h3>{step.title}</h3>
   <p>{step.copy}</p>
   <div className="tour-dock-actions">
    <button className="btn btn-ghost" onClick={prev} disabled={index===0}><ArrowLeft size={15}/>Kembali</button>
    <button className="btn btn-primary" onClick={next}>{index===steps.length-1?<><CheckCircle2 size={15}/>Selesai</>:<>Lanjut<ArrowRight size={15}/></>}</button>
   </div>
  </div>}
 </>;
}
