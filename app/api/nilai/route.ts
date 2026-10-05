import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import { db } from '@/lib/db';

export async function POST(req: Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json();if(!b.assessment_id||!Array.isArray(b.scores))return NextResponse.json({message:'Data nilai belum lengkap.'},{status:400});
  const sql=db();
  const own=await sql`SELECT id,class_id FROM assessments WHERE id=${b.assessment_id} AND license_id=${s.licenseId} LIMIT 1`;
  if(!own[0])return NextResponse.json({message:'Penilaian tidak ditemukan.'},{status:404});
  if(!own[0].class_id)return NextResponse.json({message:'Penilaian lama belum terhubung ke kelas. Muat ulang aplikasi terlebih dahulu.'},{status:409});
  if(b.scores.length){
   await sql`INSERT INTO student_scores(license_id,assessment_id,student_id,score,remedial_score,note)
    SELECT ${s.licenseId},${b.assessment_id},st.id,x.score,x.remedial_score,x.note
    FROM jsonb_to_recordset(${JSON.stringify(b.scores)}::jsonb) AS x(student_id text,score numeric,remedial_score numeric,note text)
    JOIN students st ON st.id=x.student_id::uuid AND st.license_id=${s.licenseId} AND st.status<>'Dihapus'
    JOIN class_enrollments ce ON ce.student_id=st.id AND ce.license_id=${s.licenseId} AND ce.class_id=${own[0].class_id} AND ce.status='Aktif'
    ON CONFLICT(assessment_id,student_id) DO UPDATE SET score=EXCLUDED.score,remedial_score=EXCLUDED.remedial_score,note=EXCLUDED.note,updated_at=now()`
  }
  return NextResponse.json({ok:true});
 }catch(e){console.error(e);return NextResponse.json({message:'Nilai belum berhasil disimpan.'},{status:500})}
}

export async function DELETE(req: Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const {assessment_id,student_id}=await req.json();const sql=db();
  await sql`DELETE FROM student_scores ss USING assessments a,class_enrollments ce
    WHERE ss.license_id=${s.licenseId} AND ss.assessment_id=${assessment_id} AND ss.student_id=${student_id}
      AND a.id=ss.assessment_id AND a.license_id=${s.licenseId}
      AND ce.license_id=${s.licenseId} AND ce.class_id=a.class_id AND ce.student_id=ss.student_id AND ce.status='Aktif'`;
  return NextResponse.json({ok:true});
 }catch(e){console.error(e);return NextResponse.json({message:'Nilai belum berhasil dihapus.'},{status:500})}
}
