import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';

const modes=new Set(['wali','mapel','keduanya']);
function clean(v:any){return String(v??'').trim()}

export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();
  const b=await req.json(),sql=db(),action=clean(b.action);
  if(action==='add_class'){
   const name=clean(b.name);if(!name)return NextResponse.json({message:'Nama kelas wajib diisi.'},{status:400});
   const lic=await sql`SELECT academic_year FROM licenses WHERE id=${s.licenseId} LIMIT 1`;
   const year=clean(b.academic_year)||String(lic[0]?.academic_year||'2026/2027');
   const r=await sql`INSERT INTO classes(license_id,name,academic_year,is_homeroom,is_active)
     VALUES(${s.licenseId},${name},${year},false,true)
     ON CONFLICT(license_id,academic_year,name) DO UPDATE SET is_active=true,updated_at=now()
     RETURNING id,name,academic_year,is_homeroom`;
   return NextResponse.json({ok:true,class:r[0]});
  }
  if(action==='set_mode'){
   const mode=clean(b.usage_mode);if(!modes.has(mode))return NextResponse.json({message:'Mode penggunaan tidak valid.'},{status:400});
   await sql`UPDATE licenses SET usage_mode=${mode},updated_at=now() WHERE id=${s.licenseId}`;
   return NextResponse.json({ok:true});
  }
  if(action==='set_homeroom'){
   const id=clean(b.class_id);const own=await sql`SELECT id,name FROM classes WHERE id=${id} AND license_id=${s.licenseId} AND is_active=true LIMIT 1`;if(!own[0])return NextResponse.json({message:'Kelas tidak ditemukan.'},{status:404});
   await sql`UPDATE classes SET is_homeroom=(id=${id}::uuid),updated_at=now() WHERE license_id=${s.licenseId}`;
   await sql`UPDATE licenses SET class_name=${own[0].name},updated_at=now() WHERE id=${s.licenseId}`;
   return NextResponse.json({ok:true});
  }
  if(action==='add_assignment'){
   const classId=clean(b.class_id);let subjectId=clean(b.subject_id),subjectName=clean(b.subject_name);
   const cls=await sql`SELECT id FROM classes WHERE id=${classId} AND license_id=${s.licenseId} AND is_active=true LIMIT 1`;if(!cls[0])return NextResponse.json({message:'Kelas tidak ditemukan.'},{status:404});
   if(!subjectId&&subjectName){const r=await sql`INSERT INTO subjects(license_id,name,teacher_name,mastery_score,is_active) VALUES(${s.licenseId},${subjectName},(SELECT teacher_name FROM licenses WHERE id=${s.licenseId}),75,true) ON CONFLICT(license_id,name) DO UPDATE SET is_active=true,updated_at=now() RETURNING id`;subjectId=String(r[0].id)}
   if(!subjectId)return NextResponse.json({message:'Pilih mata pelajaran.'},{status:400});
   const own=await sql`SELECT id FROM subjects WHERE id=${subjectId} AND license_id=${s.licenseId} LIMIT 1`;if(!own[0])return NextResponse.json({message:'Mata pelajaran tidak ditemukan.'},{status:404});
   await sql`INSERT INTO teaching_assignments(license_id,class_id,subject_id,is_active) VALUES(${s.licenseId},${classId},${subjectId},true) ON CONFLICT(license_id,class_id,subject_id) DO UPDATE SET is_active=true,updated_at=now()`;
   return NextResponse.json({ok:true});
  }
  if(action==='remove_assignment'){
   await sql`UPDATE teaching_assignments SET is_active=false,updated_at=now() WHERE id=${b.id} AND license_id=${s.licenseId}`;
   return NextResponse.json({ok:true});
  }
  if(action==='archive_class'){
   const id=clean(b.class_id);
   await sql`UPDATE classes SET is_active=false,is_homeroom=false,updated_at=now() WHERE id=${id} AND license_id=${s.licenseId}`;
   await sql`UPDATE teaching_assignments SET is_active=false,updated_at=now() WHERE class_id=${id} AND license_id=${s.licenseId}`;
   return NextResponse.json({ok:true});
  }
  return NextResponse.json({message:'Aksi ruang kerja tidak dikenali.'},{status:400});
 }catch(e){console.error(e);return NextResponse.json({message:'Ruang kerja belum berhasil diperbarui.'},{status:500})}
}

export async function PATCH(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();const b=await req.json(),sql=db();const name=clean(b.name);if(!name)return NextResponse.json({message:'Nama kelas wajib diisi.'},{status:400});
  const r=await sql`UPDATE classes SET name=${name},academic_year=COALESCE(NULLIF(${clean(b.academic_year)},''),academic_year),updated_at=now() WHERE id=${b.id} AND license_id=${s.licenseId} RETURNING id,name,academic_year,is_homeroom`;
  if(!r[0])return NextResponse.json({message:'Kelas tidak ditemukan.'},{status:404});
  if(r[0].is_homeroom)await sql`UPDATE licenses SET class_name=${r[0].name},academic_year=${r[0].academic_year},updated_at=now() WHERE id=${s.licenseId}`;
  return NextResponse.json({ok:true,class:r[0]});
 }catch(e){console.error(e);return NextResponse.json({message:'Kelas belum berhasil diperbarui.'},{status:500})}
}
