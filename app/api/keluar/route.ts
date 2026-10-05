import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { ensureV4Schema } from '@/lib/v4-schema';

export async function POST(){
  const s=await getSession();
  if(s){
    try{
      await ensureV4Schema();
      const key=(await cookies()).get('kk_device_id')?.value||'';
      if(key){
        const sql=db();
        await sql`UPDATE device_sessions SET revoked_at=now() WHERE license_id=${s.licenseId} AND device_key=${key} AND revoked_at IS NULL`;
      }
    }catch(e){console.error('device-logout',e)}
  }
  await clearSession();
  return NextResponse.json({ok:true});
}
