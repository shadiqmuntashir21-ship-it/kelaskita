import {cookies} from 'next/headers';
import {getSession} from '@/lib/auth';
import {db} from '@/lib/db';
import {ensureV4Schema} from '@/lib/v4-schema';

export async function getClassSession(){
  const s=await getSession();
  if(!s)return null;
  await ensureV4Schema();
  const key=(await cookies()).get('kk_device_id')?.value||'';
  if(!key)return s; // sesi lama tetap diberi masa transisi sampai login berikutnya
  const sql=db();
  const rows=await sql`SELECT id FROM device_sessions WHERE license_id=${s.licenseId} AND device_key=${key} AND revoked_at IS NULL AND expires_at>now() LIMIT 1`;
  if(!rows[0])return null;
  await sql`UPDATE device_sessions SET last_seen_at=now(),expires_at=GREATEST(expires_at,now()+interval '14 days') WHERE license_id=${s.licenseId} AND device_key=${key} AND last_seen_at<now()-interval '10 minutes'`;
  return s;
}
