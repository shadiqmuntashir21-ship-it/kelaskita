import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {ensureV4Schema} from '@/lib/v4-schema';
export async function PATCH(req:Request){
  const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  await ensureV4Schema();const b=await req.json();const sql=db();
  await sql`UPDATE licenses SET onboarding_completed=${!!b.completed},updated_at=now() WHERE id=${s.licenseId}`;
  return NextResponse.json({ok:true});
}
