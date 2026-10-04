import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
export const metadata:Metadata={title:'KelasKita — Ruang Kerja Wali Kelas',description:'Kelola siswa, kehadiran, akademik, jadwal, administrasi, dan laporan wali kelas dalam satu aplikasi.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon-64.png',apple:'/apple-touch-icon.png'}};
export const viewport:Viewport={themeColor:'#0F2D6B',width:'device-width',initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body><PwaRegister/>{children}</body></html>}
