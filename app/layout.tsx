import type { Metadata } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'KelasKita — Asisten Wali Kelas',
  description: 'Kelola kelas, dampingi siswa, dan rapikan administrasi wali kelas dalam satu aplikasi.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="id"><body><PwaRegister/>{children}</body></html>;
}
