import {NextResponse} from 'next/server';
import {getOwnerSession} from '@/lib/auth';
import {db} from '@/lib/db';
import {ensureV4Schema} from '@/lib/v4-schema';

export async function GET(req:Request){
  if(!await getOwnerSession())return NextResponse.json({message:'Tidak berwenang.'},{status:401});
  await ensureV4Schema();const url=new URL(req.url),licenseId=url.searchParams.get('license_id');if(!licenseId)return NextResponse.json({message:'Lisensi wajib dipilih.'},{status:400});
  const sql=db();const lic=await sql`SELECT id,code,teacher_name,class_name,max_devices FROM licenses WHERE id=${licenseId} LIMIT 1`;
  if(!lic[0])return NextResponse.json({message:'Lisensi tidak ditemukan.'},{status:404});
  const devices=await sql`SELECT id,device_name,created_at,last_seen_at,expires_at,revoked_at FROM device_sessions WHERE license_id=${licenseId} ORDER BY CASE WHEN revoked_at IS NULL AND expires_at>now() THEN 0 ELSE 1 END,last_seen_at DESC`;
  return NextResponse.json({license:lic[0],devices:devices.map((x:any)=>({...x,is_active:!x.revoked_at&&new Date(x.expires_at).getTime()>Date.now()}))});
}
export async function POST(req:Request){
  if(!await getOwnerSession())return NextResponse.json({message:'Tidak berwenang.'},{status:401});
  await ensureV4Schema();const b=await req.json();const sql=db();
  if(b.action==='reset'){await sql`UPDATE device_sessions SET revoked_at=now() WHERE license_id=${b.license_id} AND revoked_at IS NULL`;return NextResponse.json({ok:true})}
  if(b.action==='revoke'){await sql`UPDATE device_sessions SET revoked_at=now() WHERE id=${b.id} AND license_id=${b.license_id}`;return NextResponse.json({ok:true})}
  return NextResponse.json({message:'Aksi tidak dikenali.'},{status:400});
}
