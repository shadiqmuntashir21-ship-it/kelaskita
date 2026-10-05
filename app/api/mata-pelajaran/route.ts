import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {resolveClassContext} from '@/lib/v5-context';

export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json(),name=String(b.name||'').trim();
  if(!name)return NextResponse.json({message:'Nama mata pelajaran wajib diisi.'},{status:400});
  const sql=db(),cls=await resolveClassContext(s.licenseId,b.class_id);
  const r=await sql`INSERT INTO subjects(license_id,name,teacher_name,mastery_score,is_active)
    VALUES(${s.licenseId},${name},${b.teacher_name||null},${Number(b.mastery_score||75)},true)
    ON CONFLICT(license_id,name) DO UPDATE SET is_active=true,teacher_name=COALESCE(EXCLUDED.teacher_name,subjects.teacher_name),updated_at=now()
    RETURNING id`;
  if(cls&&!cls.is_homeroom){
    await sql`INSERT INTO teaching_assignments(license_id,class_id,subject_id,is_active)
      VALUES(${s.licenseId},${cls.id},${r[0].id},true)
      ON CONFLICT(license_id,class_id,subject_id) DO UPDATE SET is_active=true,updated_at=now()`;
  }
  return NextResponse.json({ok:true,id:r[0].id});
 }catch(e:any){console.error(e);return NextResponse.json({message:'Mata pelajaran belum berhasil ditambahkan.'},{status:500})}
}

export async function PATCH(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json(),sql=db();
  const r=await sql`UPDATE subjects SET name=${b.name},teacher_name=${b.teacher_name||null},mastery_score=${Number(b.mastery_score||75)},updated_at=now()
    WHERE id=${b.id} AND license_id=${s.licenseId} AND (${b.expected_updated_at||null}::timestamptz IS NULL OR updated_at=${b.expected_updated_at||null}::timestamptz)
    RETURNING updated_at`;
  if(!r[0])return NextResponse.json({message:'Mata pelajaran sudah berubah dari perangkat lain. Muat ulang sebelum menyimpan.'},{status:409});
  return NextResponse.json({ok:true,updated_at:r[0].updated_at});
 }catch(e:any){
  console.error(e);
  if(String(e?.message||'').toLowerCase().includes('unique'))return NextResponse.json({message:'Nama mata pelajaran tersebut sudah digunakan.'},{status:409});
  return NextResponse.json({message:'Mata pelajaran belum berhasil diperbarui.'},{status:500})
 }
}

export async function DELETE(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json(),sql=db(),cls=await resolveClassContext(s.licenseId,b.class_id);
  if(!cls)return NextResponse.json({message:'Kelas aktif tidak ditemukan.'},{status:404});
  const own=await sql`SELECT id FROM subjects WHERE id=${b.id} AND license_id=${s.licenseId} LIMIT 1`;
  if(!own[0])return NextResponse.json({message:'Mata pelajaran tidak ditemukan.'},{status:404});

  if(!cls.is_homeroom){
    await sql`UPDATE teaching_assignments SET is_active=false,updated_at=now()
      WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND subject_id=${b.id}`;
    return NextResponse.json({ok:true,scope:'class'});
  }

  const otherUse=await sql`SELECT 1 FROM teaching_assignments
    WHERE license_id=${s.licenseId} AND subject_id=${b.id} AND class_id<>${cls.id} AND is_active=true LIMIT 1`;
  if(otherUse[0])return NextResponse.json({message:'Mapel ini masih digunakan pada kelas ajar lain. Lepas penugasannya dari Pengaturan sebelum menonaktifkan mapel.'},{status:409});
  await sql`UPDATE subjects SET is_active=false,updated_at=now() WHERE id=${b.id} AND license_id=${s.licenseId}`;
  return NextResponse.json({ok:true,scope:'license'});
 }catch(e){console.error(e);return NextResponse.json({message:'Mata pelajaran belum berhasil dinonaktifkan.'},{status:500})}
}
