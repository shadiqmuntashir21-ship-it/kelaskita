import type { Metadata, Viewport } from 'next';
import './globals.css';
import './premium.css';
import './rebrand.css';
import PwaRegister from '@/components/PwaRegister';

export const metadata:Metadata={
  title:'KelasKita — Ruang Kerja Guru',
  description:'Ruang kerja digital untuk wali kelas dan guru mata pelajaran: kelas, kehadiran, nilai, catatan, administrasi, Excel, dan laporan dalam satu tempat.',
  manifest:'/manifest.webmanifest',
  icons:{icon:'/favicon-64.png',apple:'/apple-touch-icon.png'}
};

export const viewport:Viewport={
  themeColor:'#1A285C',
  width:'device-width',
  initialScale:1
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="id"><body><PwaRegister/>{children}</body></html>
}
