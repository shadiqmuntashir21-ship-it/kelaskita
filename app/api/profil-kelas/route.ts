import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {resolveClassContext} from '@/lib/v5-context';

export async function PATCH(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json();
  if(!b.teacher_name||!b.school_name||!b.class_name||!b.academic_year)return NextResponse.json({message:'Profil kelas belum lengkap.'},{status:400});
  const sql=db(),cls=await resolveClassContext(s.licenseId,b.class_id);
  if(!cls)return NextResponse.json({message:'Kelas aktif tidak ditemukan.'},{status:404});
  await sql`UPDATE licenses SET teacher_name=${String(b.teacher_name).trim()},school_name=${String(b.school_name).trim()},updated_at=now() WHERE id=${s.licenseId}`;
  await sql`UPDATE classes SET name=${String(b.class_name).trim()},academic_year=${String(b.academic_year).trim()},updated_at=now() WHERE id=${cls.id} AND license_id=${s.licenseId}`;
  if(cls.is_homeroom)await sql`UPDATE licenses SET class_name=${String(b.class_name).trim()},academic_year=${String(b.academic_year).trim()},updated_at=now() WHERE id=${s.licenseId}`;
  return NextResponse.json({ok:true});
 }catch(e:any){
  console.error(e);
  if(String(e?.message||'').toLowerCase().includes('unique'))return NextResponse.json({message:'Nama kelas tersebut sudah digunakan pada tahun ajaran yang sama.'},{status:409});
  return NextResponse.json({message:'Profil kelas belum berhasil disimpan.'},{status:500})
 }
}
