import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {resolveClassContext} from '@/lib/v5-context';

async function ownsSubject(sql:ReturnType<typeof db>,licenseId:string,id:string){const r=await sql`SELECT id FROM subjects WHERE id=${id} AND license_id=${licenseId}`;return!!r[0]}
export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json(),sql=db(),cls=await resolveClassContext(s.licenseId,b.class_id);
  if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
  if(!await ownsSubject(sql,s.licenseId,b.subject_id))return NextResponse.json({message:'Mata pelajaran tidak ditemukan.'},{status:404});
  const r=await sql`INSERT INTO assessments(license_id,class_id,subject_id,name,category,semester,assessment_date,max_score)
    VALUES(${s.licenseId},${cls.id},${b.subject_id},${b.name},${b.category},${b.semester||'Ganjil'},${b.assessment_date||new Date().toISOString().slice(0,10)}::date,${Number(b.max_score||100)}) RETURNING id`;
  return NextResponse.json({ok:true,id:r[0].id});
 }catch(e){console.error(e);return NextResponse.json({message:'Penilaian belum berhasil ditambahkan.'},{status:500})}
}
export async function PATCH(req:Request){const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});try{const b=await req.json();const sql=db();const r=await sql`UPDATE assessments SET name=${b.name},category=${b.category},semester=${b.semester||'Ganjil'},assessment_date=${b.assessment_date}::date,max_score=${Number(b.max_score||100)},updated_at=now() WHERE id=${b.id} AND license_id=${s.licenseId} AND (${b.expected_updated_at||null}::timestamptz IS NULL OR updated_at=${b.expected_updated_at||null}::timestamptz) RETURNING updated_at`;if(!r[0])return NextResponse.json({message:'Penilaian sudah berubah dari perangkat lain. Muat ulang sebelum menyimpan.'},{status:409});return NextResponse.json({ok:true,updated_at:r[0].updated_at})}catch(e){console.error(e);return NextResponse.json({message:'Penilaian belum berhasil diperbarui.'},{status:500})}}
export async function DELETE(req:Request){const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});try{const{id}=await req.json();const sql=db();await sql`DELETE FROM assessments WHERE id=${id} AND license_id=${s.licenseId}`;return NextResponse.json({ok:true})}catch(e){console.error(e);return NextResponse.json({message:'Penilaian belum berhasil dihapus.'},{status:500})}}
