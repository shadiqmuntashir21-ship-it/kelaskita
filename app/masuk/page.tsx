import Link from 'next/link';
import LoginForm from '@/components/LoginForm';
import Brand from '@/components/Brand';
export default function Masuk(){return <main className="login-page"><section className="login-art"><Brand inverse/><div><span className="pill" style={{background:'rgba(255,255,255,.08)',borderColor:'rgba(255,255,255,.12)',color:'#dfe5f5'}}>Akses guru</span><h1>Satu akun guru. Semua kelas lebih rapi.</h1><p>Masuk sebagai wali kelas, guru mata pelajaran, atau keduanya. Kelola kelas, nilai, kehadiran, catatan, dan laporan dari satu ruang kerja.</p></div><small style={{color:'#9bb0d4'}}>KelasKita · by Teman Digital</small></section><section className="login-panel"><LoginForm/></section></main>}
