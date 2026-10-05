import {NextResponse}from'next/server';
import{getClassSession as getSession}from'@/lib/class-session';
import{db}from'@/lib/db';
import{resolveClassContext}from'@/lib/v5-context';
import{ensureV5Schema}from'@/lib/v5-schema';
export const runtime='nodejs';

export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();
  const b=await req.json();
  if(!b.new_academic_year||!b.new_class_name||!Array.isArray(b.promote_ids))return NextResponse.json({message:'Data kenaikan kelas belum lengkap.'},{status:400});
  const sql=db(),cls=await resolveClassContext(s.licenseId,b.class_id);
  if(!cls)return NextResponse.json({message:'Kelas aktif tidak ditemukan.'},{status:404});
  const classId=String(cls.id);
  const [profile,students,attendance,notes,achievements,followUps,agendas,subjects,schedules,assessments,scores,reportNotes,officers,duties,admin]=await Promise.all([
   sql`SELECT teacher_name,school_name FROM licenses WHERE id=${s.licenseId}`,
   sql`SELECT st.* FROM class_enrollments ce JOIN students st ON st.id=ce.student_id WHERE ce.license_id=${s.licenseId} AND ce.class_id=${classId} AND ce.status='Aktif'`,
   sql`SELECT ad.attendance_date,ar.* FROM attendance_days ad JOIN attendance_records ar ON ar.attendance_day_id=ad.id WHERE ad.license_id=${s.licenseId} AND ad.class_id=${classId}`,
   sql`SELECT * FROM student_notes WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT * FROM achievements WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT * FROM follow_ups WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT * FROM class_agendas WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT DISTINCT su.* FROM subjects su LEFT JOIN teaching_assignments ta ON ta.subject_id=su.id AND ta.license_id=${s.licenseId} WHERE su.license_id=${s.licenseId} AND (ta.class_id=${classId} OR ta.id IS NULL)`,
   sql`SELECT * FROM subject_schedules WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT * FROM assessments WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT ss.* FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id WHERE ss.license_id=${s.licenseId} AND a.class_id=${classId}`,
   sql`SELECT * FROM report_notes WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT * FROM class_officers WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT * FROM duty_roster WHERE license_id=${s.licenseId} AND class_id=${classId}`,
   sql`SELECT * FROM class_admin_items WHERE license_id=${s.licenseId} AND class_id=${classId}`
  ]);
  const p=profile[0]||{};
  const snapshot={profile:{...p,class_name:cls.name,academic_year:cls.academic_year},students,attendance,notes,achievements,followUps,agendas,subjects,schedules,assessments,scores,reportNotes,officers,duties,admin};
  await sql`INSERT INTO class_year_archives(license_id,academic_year,class_name,snapshot)
    VALUES(${s.licenseId},${cls.academic_year},${cls.name},${JSON.stringify(snapshot)}::jsonb)
    ON CONFLICT(license_id,academic_year,class_name) DO UPDATE SET snapshot=EXCLUDED.snapshot,closed_at=now()`;

  const newClass=await sql`INSERT INTO classes(license_id,name,academic_year,is_homeroom,is_active)
    VALUES(${s.licenseId},${String(b.new_class_name).trim()},${String(b.new_academic_year).trim()},${!!cls.is_homeroom},true)
    ON CONFLICT(license_id,academic_year,name) DO UPDATE SET is_active=true,is_homeroom=EXCLUDED.is_homeroom,updated_at=now()
    RETURNING id,name,academic_year,is_homeroom`;
  const newClassId=String(newClass[0].id);
  const ids=[...new Set(b.promote_ids.map(String))];

  for(const student of students as any[]){
   const promoted=ids.includes(String(student.id));
   await sql`UPDATE class_enrollments SET status=${promoted?'Naik Kelas':String(b.other_status||'Lulus')},left_at=now(),updated_at=now()
     WHERE license_id=${s.licenseId} AND class_id=${classId} AND student_id=${student.id}`;
   if(promoted){
    await sql`INSERT INTO class_enrollments(license_id,class_id,student_id,status)
      VALUES(${s.licenseId},${newClassId},${student.id},'Aktif')
      ON CONFLICT(class_id,student_id) DO UPDATE SET status='Aktif',left_at=NULL,updated_at=now()`;
   }
  }

  const assignments=await sql`SELECT subject_id FROM teaching_assignments WHERE license_id=${s.licenseId} AND class_id=${classId} AND is_active=true`;
  for(const a of assignments as any[]){
   await sql`INSERT INTO teaching_assignments(license_id,class_id,subject_id,is_active)
     VALUES(${s.licenseId},${newClassId},${a.subject_id},true)
     ON CONFLICT(license_id,class_id,subject_id) DO UPDATE SET is_active=true,updated_at=now()`;
  }

  await sql`UPDATE classes SET is_active=false,is_homeroom=false,updated_at=now() WHERE id=${classId} AND license_id=${s.licenseId}`;
  await sql`UPDATE teaching_assignments SET is_active=false,updated_at=now() WHERE class_id=${classId} AND license_id=${s.licenseId}`;

  if(cls.is_homeroom){
   await sql`UPDATE classes SET is_homeroom=(id=${newClassId}::uuid),updated_at=now() WHERE license_id=${s.licenseId}`;
   await sql`UPDATE licenses SET academic_year=${String(b.new_academic_year).trim()},class_name=${String(b.new_class_name).trim()},updated_at=now() WHERE id=${s.licenseId}`;
  }
  await sql`INSERT INTO activity_logs(license_id,action,entity_type,entity_id,metadata)
    VALUES(${s.licenseId},'Menutup tahun ajaran','kelas',${classId},${JSON.stringify({old_class:cls.name,old_year:cls.academic_year,new_class_id:newClassId,new_class:b.new_class_name,new_year:b.new_academic_year,promoted:ids.length})}::jsonb)`;
  return NextResponse.json({ok:true,archive_year:cls.academic_year,new_class_id:newClassId});
 }catch(e){console.error(e);return NextResponse.json({message:'Tahun ajaran belum berhasil ditutup.'},{status:500})}
}
