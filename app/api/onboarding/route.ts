import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';

const modes=new Set(['wali','mapel','keduanya']);
function clean(v:any){return String(v??'').trim()}

export async function PATCH(req:Request){
 const s=await getSession();
 if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();
  const b=await req.json();
  const sql=db();

  // Kompatibilitas endpoint V4.
  if(!b.usage_mode){
   await sql`UPDATE licenses SET onboarding_completed=${!!b.completed},updated_at=now() WHERE id=${s.licenseId}`;
   return NextResponse.json({ok:true});
  }

  const usageMode=clean(b.usage_mode);
  if(!modes.has(usageMode))return NextResponse.json({message:'Pilih cara menggunakan KelasKita.'},{status:400});

  const licenseRows=await sql`SELECT academic_year,class_name FROM licenses WHERE id=${s.licenseId} LIMIT 1`;
  const license=licenseRows[0];
  if(!license)return NextResponse.json({message:'Lisensi tidak ditemukan.'},{status:404});
  const academicYear=clean(b.academic_year)||String(license.academic_year||'2026/2027');

  let homeroomId=clean(b.homeroom_class_id);
  const homeroomName=clean(b.homeroom_class_name);
  if((usageMode==='wali'||usageMode==='keduanya')){
   if(homeroomId){
    const own=await sql`SELECT id,name FROM classes WHERE id=${homeroomId} AND license_id=${s.licenseId} LIMIT 1`;
    if(!own[0])homeroomId='';
   }
   if(!homeroomId){
    const name=homeroomName||clean(license.class_name)||'Kelas Utama';
    const rows=await sql`INSERT INTO classes(license_id,name,academic_year,is_homeroom)
      VALUES(${s.licenseId},${name},${academicYear},true)
      ON CONFLICT(license_id,academic_year,name) DO UPDATE SET is_homeroom=true,is_active=true,updated_at=now()
      RETURNING id,name`;
    homeroomId=String(rows[0].id);
   }
   await sql`UPDATE classes SET is_homeroom=(id=${homeroomId}::uuid),updated_at=now() WHERE license_id=${s.licenseId}`;
  }

  const subjectName=clean(b.subject_name);
  const teachingNames=Array.isArray(b.teaching_classes)?[...new Set(b.teaching_classes.map(clean).filter(Boolean))]:[];
  let subjectId=clean(b.subject_id);
  if(usageMode==='mapel'||usageMode==='keduanya'){
   if(subjectId){
    const own=await sql`SELECT id FROM subjects WHERE id=${subjectId} AND license_id=${s.licenseId} LIMIT 1`;
    if(!own[0])subjectId='';
   }
   if(!subjectId&&subjectName){
    const rows=await sql`INSERT INTO subjects(license_id,name,teacher_name,mastery_score,is_active)
      VALUES(${s.licenseId},${subjectName},(SELECT teacher_name FROM licenses WHERE id=${s.licenseId}),75,true)
      ON CONFLICT(license_id,name) DO UPDATE SET is_active=true,updated_at=now()
      RETURNING id`;
    subjectId=String(rows[0].id);
   }
   if(!subjectId)return NextResponse.json({message:'Pilih atau isi mata pelajaran yang Anda ajar.'},{status:400});

   const names=teachingNames.length?teachingNames:
     (homeroomId&&usageMode==='keduanya'?[homeroomName||clean(license.class_name)||'Kelas Utama']:[]);
   if(!names.length)return NextResponse.json({message:'Tambahkan minimal satu kelas yang Anda ajar.'},{status:400});

   for(const name of names){
    const cls=await sql`INSERT INTO classes(license_id,name,academic_year,is_homeroom)
      VALUES(${s.licenseId},${name},${academicYear},false)
      ON CONFLICT(license_id,academic_year,name) DO UPDATE SET is_active=true,updated_at=now()
      RETURNING id`;
    await sql`INSERT INTO teaching_assignments(license_id,class_id,subject_id,is_active)
      VALUES(${s.licenseId},${cls[0].id},${subjectId},true)
      ON CONFLICT(license_id,class_id,subject_id) DO UPDATE SET is_active=true,updated_at=now()`;
   }
  }

  const primary=homeroomId
   ?await sql`SELECT name FROM classes WHERE id=${homeroomId} AND license_id=${s.licenseId} LIMIT 1`
   :await sql`SELECT name FROM classes WHERE license_id=${s.licenseId} AND is_active=true ORDER BY created_at LIMIT 1`;
  await sql`UPDATE licenses SET usage_mode=${usageMode},v5_onboarding_completed=${b.completed!==false},onboarding_completed=true,
    class_name=COALESCE(${primary[0]?.name||null},class_name),updated_at=now() WHERE id=${s.licenseId}`;
  return NextResponse.json({ok:true,usage_mode:usageMode});
 }catch(e){
  console.error(e);
  return NextResponse.json({message:'Pengaturan awal V5 belum berhasil disimpan.'},{status:500});
 }
}
