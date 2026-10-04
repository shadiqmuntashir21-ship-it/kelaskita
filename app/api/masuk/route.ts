import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPin } from '@/lib/pin';
import { setSession } from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){
  try{
    const {code,pin}=await req.json();
    if(!code||!pin)return NextResponse.json({message:'Kode lisensi dan PIN wajib diisi.'},{status:400});
    const sql=db();
    const rows=await sql`SELECT id, code, pin_hash, is_active, expires_at FROM licenses WHERE code=${String(code).trim().toUpperCase()} LIMIT 1`;
    const lic=rows[0] as any;
    if(!lic||!verifyPin(String(pin),lic.pin_hash))return NextResponse.json({message:'Kode lisensi atau PIN tidak sesuai.'},{status:401});
    if(!lic.is_active)return NextResponse.json({message:'Lisensi ini sedang tidak aktif. Hubungi KelasKita.'},{status:403});
    if(lic.expires_at&&new Date(lic.expires_at).getTime()<Date.now())return NextResponse.json({message:'Masa aktif lisensi telah berakhir.'},{status:403});
    await sql`UPDATE licenses SET last_login_at=now(), updated_at=now() WHERE id=${lic.id}`;
    await sql`INSERT INTO activity_logs(license_id,action,entity_type,entity_id) VALUES (${lic.id},'Masuk ke aplikasi','lisensi',${lic.id})`;
    await setSession(lic.id,lic.code);
    return NextResponse.json({ok:true});
  }catch(e){console.error(e);return NextResponse.json({message:'Belum dapat masuk. Silakan coba lagi.'},{status:500})}
}
