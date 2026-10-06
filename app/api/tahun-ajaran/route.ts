import {NextResponse}from'next/server';
import{randomUUID}from'crypto';
import{getClassSession as getSession}from'@/lib/class-session';
import{db}from'@/lib/db';
import{resolveClassContext}from'@/lib/v5-context';
import{ensureV5Schema}from'@/lib/v5-schema';
export const runtime='nodejs';

async function classCounts(sql:any,licenseId:string,classId:string){
 const [students,attendanceDays,attendanceExceptions,subjectSessions,subjectExceptions,notes,achievements,followUps,agendas,assessments,scores,reports,admin,schedules]=await Promise.all([
  sql`SELECT COUNT(*)::int n FROM class_enrollments WHERE license_id=${licenseId} AND class_id=${classId} AND status='Aktif'`,
  sql`SELECT COUNT(*)::int n FROM attendance_days WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(ar.*)::int n FROM attendance_records ar JOIN attendance_days ad ON ad.id=ar.attendance_day_id WHERE ad.license_id=${licenseId} AND ad.class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM subject_attendance_sessions WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(sar.*)::int n FROM subject_attendance_records sar JOIN subject_attendance_sessions sas ON sas.id=sar.session_id WHERE sas.license_id=${licenseId} AND sas.class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM student_notes WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM achievements WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM follow_ups WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM class_agendas WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM assessments WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(ss.*)::int n FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id WHERE ss.license_id=${licenseId} AND a.class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM report_notes WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM class_admin_items WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int n FROM subject_schedules WHERE license_id=${licenseId} AND class_id=${classId}`
 ]);
 return{
  students:students[0]?.n||0,attendanceDays:attendanceDays[0]?.n||0,attendanceExceptions:attendanceExceptions[0]?.n||0,
  subjectSessions:subjectSessions[0]?.n||0,subjectExceptions:subjectExceptions[0]?.n||0,notes:notes[0]?.n||0,
  achievements:achievements[0]?.n||0,followUps:followUps[0]?.n||0,agendas:agendas[0]?.n||0,
  assessments:assessments[0]?.n||0,scores:scores[0]?.n||0,reports:reports[0]?.n||0,admin:admin[0]?.n||0,schedules:schedules[0]?.n||0
 };
}

export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();
  const b=await req.json();
  if(!b.new_academic_year||!b.new_class_name||!Array.isArray(b.promote_ids))return NextResponse.json({message:'Data kenaikan kelas belum lengkap.'},{status:400});
  if(b.backup_confirmed!==true)return NextResponse.json({message:'Cadangan lengkap wajib diunduh dan dikonfirmasi sebelum menutup tahun ajaran.'},{status:400});

  const newYear=String(b.new_academic_year).trim(),newName=String(b.new_class_name).trim();
  const sql=db(),cls=await resolveClassContext(s.licenseId,b.class_id);
  if(!cls)return NextResponse.json({message:'Kelas aktif tidak ditemukan.'},{status:404});
  const classId=String(cls.id);
  if(newYear===String(cls.academic_year)&&newName===String(cls.name))return NextResponse.json({message:'Tahun ajaran atau nama kelas baru harus berbeda dari kelas yang sedang ditutup.'},{status:400});

  const [before,students,assignments,existingTarget]=await Promise.all([
   classCounts(sql,s.licenseId,classId),
   sql`SELECT st.id,st.name FROM class_enrollments ce JOIN students st ON st.id=ce.student_id WHERE ce.license_id=${s.licenseId} AND ce.class_id=${classId} AND ce.status='Aktif'`,
   sql`SELECT subject_id FROM teaching_assignments WHERE license_id=${s.licenseId} AND class_id=${classId} AND is_active=true`,
   sql`SELECT id FROM classes WHERE license_id=${s.licenseId} AND academic_year=${newYear} AND name=${newName} LIMIT 1`
  ]);
  const validStudentIds=new Set((students as any[]).map(x=>String(x.id)));
  const ids:string[]=[...new Set<string>((b.promote_ids as any[]).map((x:any)=>String(x)))].filter(id=>validStudentIds.has(id));
  const newClassId=String(existingTarget[0]?.id||randomUUID());
  const archiveSummary={
   version:'KelasKita-V7',storage_mode:'ringkasan',class_id:classId,class_name:cls.name,academic_year:cls.academic_year,
   backup_confirmed:true,counts:before,
   note:'Detail data tahun ajaran disimpan oleh guru melalui file cadangan yang diunduh sebelum penutupan.'
  };
  const activity={old_class:cls.name,old_year:cls.academic_year,new_class_id:newClassId,new_class:newName,new_year:newYear,promoted:ids.length,purged:before,archive_mode:'ringkasan'};

  await sql.transaction((tx:any)=>{
   const q:any[]=[];
   q.push(tx`INSERT INTO class_year_archives(license_id,academic_year,class_name,snapshot)
     VALUES(${s.licenseId},${cls.academic_year},${cls.name},${JSON.stringify(archiveSummary)}::jsonb)
     ON CONFLICT(license_id,academic_year,class_name) DO UPDATE SET snapshot=EXCLUDED.snapshot,closed_at=now()`);
   if(existingTarget[0]){
    q.push(tx`UPDATE classes SET is_active=true,is_homeroom=${!!cls.is_homeroom},updated_at=now() WHERE id=${newClassId} AND license_id=${s.licenseId}`);
   }else{
    q.push(tx`INSERT INTO classes(id,license_id,name,academic_year,is_homeroom,is_active)
      VALUES(${newClassId},${s.licenseId},${newName},${newYear},${!!cls.is_homeroom},true)`);
   }
   for(const student of students as any[]){
    if(ids.includes(String(student.id)))q.push(tx`INSERT INTO class_enrollments(license_id,class_id,student_id,status)
      VALUES(${s.licenseId},${newClassId},${student.id},'Aktif')
      ON CONFLICT(class_id,student_id) DO UPDATE SET status='Aktif',left_at=NULL,updated_at=now()`);
   }
   for(const a of assignments as any[])q.push(tx`INSERT INTO teaching_assignments(license_id,class_id,subject_id,is_active)
     VALUES(${s.licenseId},${newClassId},${a.subject_id},true)
     ON CONFLICT(license_id,class_id,subject_id) DO UPDATE SET is_active=true,updated_at=now()`);

   q.push(tx`DELETE FROM attendance_days WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM subject_attendance_sessions WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM student_notes WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM achievements WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM follow_ups WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM class_agendas WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM assessments WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM report_notes WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM class_admin_items WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM class_officers WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM duty_roster WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM subject_schedules WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM class_enrollments WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`DELETE FROM teaching_assignments WHERE license_id=${s.licenseId} AND class_id=${classId}`);
   q.push(tx`UPDATE classes SET is_active=false,is_homeroom=false,updated_at=now() WHERE id=${classId} AND license_id=${s.licenseId}`);
   q.push(tx`UPDATE students st SET status='Dihapus',updated_at=now() WHERE st.license_id=${s.licenseId} AND NOT EXISTS(
     SELECT 1 FROM class_enrollments ce WHERE ce.student_id=st.id AND ce.license_id=${s.licenseId} AND ce.status='Aktif'
   )`);
   if(cls.is_homeroom){
    q.push(tx`UPDATE classes SET is_homeroom=(id=${newClassId}::uuid),updated_at=now() WHERE license_id=${s.licenseId}`);
    q.push(tx`UPDATE licenses SET academic_year=${newYear},class_name=${newName},updated_at=now() WHERE id=${s.licenseId}`);
   }
   q.push(tx`INSERT INTO activity_logs(license_id,action,entity_type,entity_id,metadata)
     VALUES(${s.licenseId},'Menutup tahun ajaran dan membersihkan data lama','kelas',${classId},${JSON.stringify(activity)}::jsonb)`);
   return q;
  });

  return NextResponse.json({ok:true,archive_year:cls.academic_year,new_class_id:newClassId,purged:before,archive_mode:'ringkasan'});
 }catch(e){console.error(e);return NextResponse.json({message:'Tahun ajaran belum berhasil ditutup. Tidak ada pembersihan parsial yang seharusnya diterapkan; periksa cadangan lalu coba kembali.'},{status:500})}
}
