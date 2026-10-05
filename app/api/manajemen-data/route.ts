import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';
import {resolveClassContext} from '@/lib/v5-context';
export const runtime='nodejs';

async function counts(sql:any,licenseId:string,classId:string){
 const [students,attendance,subjectAttendance,notes,achievements,followups,agendas,assessments,scores,reports,admin]=await Promise.all([
  sql`SELECT COUNT(*)::int count FROM class_enrollments WHERE license_id=${licenseId} AND class_id=${classId} AND status='Aktif'`,
  sql`SELECT COUNT(ar.*)::int count FROM attendance_records ar JOIN attendance_days ad ON ad.id=ar.attendance_day_id WHERE ad.license_id=${licenseId} AND ad.class_id=${classId}`,
  sql`SELECT COUNT(sar.*)::int count FROM subject_attendance_records sar JOIN subject_attendance_sessions sas ON sas.id=sar.session_id WHERE sas.license_id=${licenseId} AND sas.class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM student_notes WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM achievements WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM follow_ups WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM class_agendas WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM assessments WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(ss.*)::int count FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id WHERE ss.license_id=${licenseId} AND a.class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM report_notes WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM class_admin_items WHERE license_id=${licenseId} AND class_id=${classId}`
 ]);
 return{students:students[0]?.count||0,attendance:attendance[0]?.count||0,subjectAttendance:subjectAttendance[0]?.count||0,notes:notes[0]?.count||0,achievements:achievements[0]?.count||0,followups:followups[0]?.count||0,agendas:agendas[0]?.count||0,assessments:assessments[0]?.count||0,scores:scores[0]?.count||0,reports:reports[0]?.count||0,admin:admin[0]?.count||0};
}

export async function GET(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();const url=new URL(req.url),sql=db(),cls=await resolveClassContext(s.licenseId,url.searchParams.get('class_id'));
  if(!cls)return NextResponse.json({message:'Kelas tidak ditemukan.'},{status:404});
  if(url.searchParams.get('backup')==='1'){
   const [students,attendanceDays,attendanceRecords,subjectAttendanceSessions,subjectAttendanceRecords,notes,achievements,followups,agendas,assessments,scores,reports,admin,officers,duties]=await Promise.all([
    sql`SELECT st.* FROM class_enrollments ce JOIN students st ON st.id=ce.student_id WHERE ce.license_id=${s.licenseId} AND ce.class_id=${cls.id} AND ce.status='Aktif'`,
    sql`SELECT * FROM attendance_days WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT ar.* FROM attendance_records ar JOIN attendance_days ad ON ad.id=ar.attendance_day_id WHERE ad.license_id=${s.licenseId} AND ad.class_id=${cls.id}`,
    sql`SELECT * FROM subject_attendance_sessions WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT sar.* FROM subject_attendance_records sar JOIN subject_attendance_sessions sas ON sas.id=sar.session_id WHERE sas.license_id=${s.licenseId} AND sas.class_id=${cls.id}`,
    sql`SELECT * FROM student_notes WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM achievements WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM follow_ups WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM class_agendas WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM assessments WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT ss.* FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id WHERE ss.license_id=${s.licenseId} AND a.class_id=${cls.id}`,
    sql`SELECT * FROM report_notes WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM class_admin_items WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM class_officers WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM duty_roster WHERE license_id=${s.licenseId} AND class_id=${cls.id}`
   ]);
   const payload={version:'KelasKita-V6',created_at:new Date().toISOString(),class:{id:cls.id,name:cls.name,academic_year:cls.academic_year},students,attendanceDays,attendanceRecords,subjectAttendanceSessions,subjectAttendanceRecords,notes,achievements,followups,agendas,assessments,scores,reports,admin,officers,duties};
   const safe=String(cls.name).replace(/[^A-Za-z0-9_-]+/g,'_');
   return new NextResponse(JSON.stringify(payload,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="Backup_KelasKita_'+safe+'.json"'}});
  }
  return NextResponse.json({class:cls,counts:await counts(sql,s.licenseId,String(cls.id)),confirmation:'KOSONGKAN '+cls.name});
 }catch(e){console.error(e);return NextResponse.json({message:'Informasi data kelas belum dapat dimuat.'},{status:500})}
}

export async function DELETE(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();const b=await req.json(),sql=db(),cls=await resolveClassContext(s.licenseId,b.class_id);
  if(!cls)return NextResponse.json({message:'Kelas tidak ditemukan.'},{status:404});
  const expected='KOSONGKAN '+cls.name;
  if(String(b.confirm||'')!==expected)return NextResponse.json({message:'Konfirmasi tidak cocok. Data tidak diubah.'},{status:400});
  const before=await counts(sql,s.licenseId,String(cls.id));
  await sql`DELETE FROM attendance_days WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM subject_attendance_sessions WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM student_notes WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM achievements WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM follow_ups WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM class_agendas WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM assessments WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM report_notes WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM class_admin_items WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM class_officers WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`DELETE FROM duty_roster WHERE license_id=${s.licenseId} AND class_id=${cls.id}`;
  await sql`UPDATE class_enrollments SET status='Keluar',left_at=now(),updated_at=now() WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND status='Aktif'`;
  await sql`UPDATE students st SET status='Dihapus',updated_at=now() WHERE st.license_id=${s.licenseId} AND NOT EXISTS(SELECT 1 FROM class_enrollments ce WHERE ce.student_id=st.id AND ce.license_id=${s.licenseId} AND ce.status='Aktif')`;
  await sql`INSERT INTO activity_logs(license_id,action,entity_type,entity_id,metadata) VALUES(${s.licenseId},'Mengosongkan data kelas','kelas',${String(cls.id)},${JSON.stringify({class_name:cls.name,before})}::jsonb)`;
  return NextResponse.json({ok:true,class:cls,before});
 }catch(e){console.error(e);return NextResponse.json({message:'Reset data dibatalkan karena proses belum selesai dengan aman.'},{status:500})}
}
