import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPin } from '@/lib/pin';
import { setSession } from '@/lib/auth';
import {ensureV5Schema} from '@/lib/v5-schema';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
export const runtime='nodejs';

function clean(v:any,max:number){return String(v||'').trim().slice(0,max)}

export async function POST(req:Request){
  try{
    const {code,pin}=await req.json();
    if(!code||!pin)return NextResponse.json({message:'Kode lisensi dan PIN wajib diisi.'},{status:400});
    await ensureV5Schema();
    const sql=db();
    const rows=await sql`SELECT id,code,pin_hash,is_active,expires_at FROM licenses WHERE code=${String(code).trim().toUpperCase()} LIMIT 1`;
    const lic=rows[0] as any;
    if(!lic||!verifyPin(String(pin),lic.pin_hash))return NextResponse.json({message:'Kode lisensi atau PIN tidak sesuai.'},{status:401});
    if(!lic.is_active)return NextResponse.json({message:'Lisensi ini sedang tidak aktif. Hubungi KelasKita.'},{status:403});
    if(lic.expires_at&&new Date(lic.expires_at).getTime()<Date.now())return NextResponse.json({message:'Masa aktif lisensi telah berakhir.'},{status:403});

    const cookieStore=await cookies();
    let key=cookieStore.get('kk_device_id')?.value||'';
    if(!key){key=randomUUID();cookieStore.set('kk_device_id',key,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*365})}
    if(key){
      await sql`UPDATE device_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE license_id=${lic.id} AND revoked_at IS NULL AND expires_at<=now()`;
      const limitRows=await sql`SELECT max_devices FROM licenses WHERE id=${lic.id} LIMIT 1`;
      const maxDevices=Math.max(1,Number((limitRows[0] as any)?.max_devices||5));
      const existing=await sql`SELECT id,revoked_at,expires_at FROM device_sessions WHERE license_id=${lic.id} AND device_key=${key} LIMIT 1`;
      const countRows=await sql`SELECT COUNT(*)::int count FROM device_sessions WHERE license_id=${lic.id} AND revoked_at IS NULL AND expires_at>now()`;
      const active=Number((countRows[0] as any)?.count||0);
      const alreadyActive=!!existing[0]&&!(existing[0] as any).revoked_at&&new Date((existing[0] as any).expires_at).getTime()>Date.now();
      if(!alreadyActive&&active>=maxDevices)return NextResponse.json({message:`Batas ${maxDevices} perangkat aktif sudah tercapai. Keluar dari perangkat lama atau hubungi pemilik KelasKita.`,maxDevices,activeDevices:active},{status:409});
      const ua=clean(req.headers.get('user-agent'),1000)||null;
      const raw=String(ua||'');
      const os=/Macintosh|Mac OS/i.test(raw)?'Mac':/Windows/i.test(raw)?'Windows':/Android/i.test(raw)?'Android':/iPhone|iPad/i.test(raw)?'iPhone/iPad':'Perangkat';
      const browser=/Edg\//i.test(raw)?'Edge':/Chrome\//i.test(raw)?'Chrome':/Safari\//i.test(raw)?'Safari':/Firefox\//i.test(raw)?'Firefox':'Browser';
      const name=`${os} · ${browser}`;
      await sql`INSERT INTO device_sessions(license_id,device_key,device_name,user_agent,last_seen_at,expires_at,revoked_at)
        VALUES(${lic.id},${key},${name},${ua},now(),now()+interval '14 days',NULL)
        ON CONFLICT(license_id,device_key) DO UPDATE SET device_name=EXCLUDED.device_name,user_agent=EXCLUDED.user_agent,last_seen_at=now(),expires_at=now()+interval '14 days',revoked_at=NULL`;
    }

    await sql`UPDATE licenses SET last_login_at=now(),updated_at=now() WHERE id=${lic.id}`;
    await sql`INSERT INTO activity_logs(license_id,action,entity_type,entity_id,metadata) VALUES(${lic.id},'Masuk ke aplikasi','lisensi',${lic.id},${JSON.stringify({device:'terdaftar'})}::jsonb)`;
    await setSession(lic.id,lic.code);
    return NextResponse.json({ok:true});
  }catch(e){console.error(e);return NextResponse.json({message:'Belum dapat masuk. Silakan coba lagi.'},{status:500})}
}
