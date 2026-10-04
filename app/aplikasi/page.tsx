import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import KelasKitaApp from '@/components/KelasKitaApp';
export default async function Aplikasi(){const s=await getSession();if(!s)redirect('/masuk');return <KelasKitaApp mode="real"/>}
