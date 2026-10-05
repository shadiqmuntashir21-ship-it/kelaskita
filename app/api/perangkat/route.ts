import {NextResponse} from 'next/server';
import {clearSession,getSession} from '@/lib/auth';
import {db} from '@/lib/db';
import {ensureV4Schema} from '@/lib/v4-schema';
import {cookies} from 'next/headers';

export async function GET(){
  const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  await ensureV4Schema();const sql=db();
  const lic=await sql`SELECT max_devices FROM licenses WHERE id=${s.licenseId} LIMIT 1`;
  const key=(await cookies()).get('kk_device_id')?.value||'';
  const rows=await sql`SELECT id,device_key,device_name,created_at,last_seen_at,expires_at,revoked_at FROM device_sessions WHERE license_id=${s.licenseId} ORDER BY CASE WHEN revoked_at IS NULL AND expires_at>now() THEN 0 ELSE 1 END,last_seen_at DESC`;
  return NextResponse.json({devices:rows.map((x:any)=>({...x,is_current:key===String(x.device_key),is_active:!x.revoked_at&&new Date(x.expires_at).getTime()>Date.now()})),maxDevices:Number((lic[0] as any)?.max_devices||5)});
}
export async function DELETE(req:Request){
  const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  await ensureV4Schema();const {id}=await req.json();const sql=db();
  const key=(await cookies()).get('kk_device_id')?.value||'';const r=await sql`UPDATE device_sessions SET revoked_at=now() WHERE id=${id} AND license_id=${s.licenseId} RETURNING id,device_key`;
  if(!r[0])return NextResponse.json({message:'Perangkat tidak ditemukan.'},{status:404});
  if(key&&key===String((r[0] as any).device_key)){await clearSession();return NextResponse.json({ok:true,current:true})}
  return NextResponse.json({ok:true,current:false});
}
export async function POST(req:Request){
  const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  await ensureV4Schema();const b=await req.json();const sql=db();
  if(b.action==='revoke_others'){
    const key=(await cookies()).get('kk_device_id')?.value||'';if(!key)return NextResponse.json({message:'Identitas perangkat belum tersedia. Masuk ulang terlebih dahulu.'},{status:409});
    await sql`UPDATE device_sessions SET revoked_at=now() WHERE license_id=${s.licenseId} AND device_key<>${key} AND revoked_at IS NULL`;
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({message:'Aksi tidak dikenali.'},{status:400});
}
