import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';
import {resolveClassContext} from '@/lib/v5-context';
export const runtime='nodejs';

type BackupPeriod={scope:'all'|'period';startMonth:string|null;endMonth:string|null;startDate:string|null;endExclusive:string|null;months:number|null};

function parseMonth(v:string|null){
 if(!v||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v))return null;
 const [year,month]=v.split('-').map(Number);
 return{year,month};
}
function monthStart(year:number,month:number){
 return `${year}-${String(month).padStart(2,'0')}-01`;
}
function nextMonthStart(year:number,month:number){
 const d=new Date(Date.UTC(year,month,1));
 return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-01`;
}
function resolveBackupPeriod(url:URL):BackupPeriod{
 const scope=url.searchParams.get('scope')==='all'?'all':'period';
 if(scope==='all')return{scope,startMonth:null,endMonth:null,startDate:null,endExclusive:null,months:null};
 const startMonth=url.searchParams.get('start_month'),endMonth=url.searchParams.get('end_month');
 const start=parseMonth(startMonth),end=parseMonth(endMonth);
 if(!start||!end)throw new Error('Pilih bulan awal dan bulan akhir cadangan.');
 const months=(end.year*12+end.month)-(start.year*12+start.month)+1;
 if(months<1)throw new Error('Bulan akhir tidak boleh sebelum bulan awal.');
 if(months>12)throw new Error('Satu file cadangan maksimal mencakup 12 bulan.');
 return{scope,startMonth,endMonth,startDate:monthStart(start.year,start.month),endExclusive:nextMonthStart(end.year,end.month),months};
}

async function counts(sql:any,licenseId:string,classId:string){
 const [students,attendance,subjectAttendance,notes,achievements,followups,agendas,assessments,scores,reports,admin]=await Promise.all([
  sql`SELECT COUNT(*)::int count FROM class_enrollments WHERE license_id=${licenseId} AND class_id=${classId} AND status='Aktif'`,
  sql`SELECT COUNT(*)::int count FROM attendance_days WHERE license_id=${licenseId} AND class_id=${classId}`,
  sql`SELECT COUNT(*)::int count FROM subject_attendance_sessions WHERE license_id=${licenseId} AND class_id=${classId}`,
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
   let period:BackupPeriod;
   try{period=resolveBackupPeriod(url)}catch(e:any){return NextResponse.json({message:e.message||'Periode cadangan tidak valid.'},{status:400})}
   const startDate=period.startDate,endExclusive=period.endExclusive;
   const [students,enrollments,attendanceDays,attendanceRecords,subjectAttendanceSessions,subjectAttendanceRecords,notes,achievements,followups,agendas,subjects,schedules,assignments,academicSettings,assessments,scores,reports,admin,officers,duties]=await Promise.all([
    sql`SELECT DISTINCT st.* FROM class_enrollments ce JOIN students st ON st.id=ce.student_id WHERE ce.license_id=${s.licenseId} AND ce.class_id=${cls.id}`,
    sql`SELECT id,class_id,student_id,status,enrolled_at,left_at,created_at,updated_at FROM class_enrollments WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM attendance_days WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND (${startDate}::date IS NULL OR attendance_date>=${startDate}::date) AND (${endExclusive}::date IS NULL OR attendance_date<${endExclusive}::date)`,
    sql`SELECT ar.* FROM attendance_records ar JOIN attendance_days ad ON ad.id=ar.attendance_day_id WHERE ad.license_id=${s.licenseId} AND ad.class_id=${cls.id} AND (${startDate}::date IS NULL OR ad.attendance_date>=${startDate}::date) AND (${endExclusive}::date IS NULL OR ad.attendance_date<${endExclusive}::date)`,
    sql`SELECT * FROM subject_attendance_sessions WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND (${startDate}::date IS NULL OR meeting_date>=${startDate}::date) AND (${endExclusive}::date IS NULL OR meeting_date<${endExclusive}::date)`,
    sql`SELECT sar.* FROM subject_attendance_records sar JOIN subject_attendance_sessions sas ON sas.id=sar.session_id WHERE sas.license_id=${s.licenseId} AND sas.class_id=${cls.id} AND (${startDate}::date IS NULL OR sas.meeting_date>=${startDate}::date) AND (${endExclusive}::date IS NULL OR sas.meeting_date<${endExclusive}::date)`,
    sql`SELECT * FROM student_notes WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND (${startDate}::date IS NULL OR occurred_at>=${startDate}::date) AND (${endExclusive}::date IS NULL OR occurred_at<${endExclusive}::date)`,
    sql`SELECT * FROM achievements WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND (${startDate}::date IS NULL OR achieved_at>=${startDate}::date) AND (${endExclusive}::date IS NULL OR achieved_at<${endExclusive}::date)`,
    sql`SELECT * FROM follow_ups WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND (${startDate}::date IS NULL OR created_at>=${startDate}::date OR due_date>=${startDate}::date OR completed_at>=${startDate}::date) AND (${endExclusive}::date IS NULL OR created_at<${endExclusive}::date OR due_date<${endExclusive}::date OR completed_at<${endExclusive}::date)`,
    sql`SELECT * FROM class_agendas WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND (${startDate}::date IS NULL OR agenda_date>=${startDate}::date) AND (${endExclusive}::date IS NULL OR agenda_date<${endExclusive}::date)`,
    sql`SELECT DISTINCT su.* FROM subjects su LEFT JOIN teaching_assignments ta ON ta.subject_id=su.id AND ta.license_id=${s.licenseId} WHERE su.license_id=${s.licenseId} AND (ta.class_id=${cls.id} OR ta.id IS NULL)`,
    sql`SELECT * FROM subject_schedules WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM teaching_assignments WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM academic_settings WHERE license_id=${s.licenseId}`,
    sql`SELECT * FROM assessments WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND (${startDate}::date IS NULL OR assessment_date>=${startDate}::date) AND (${endExclusive}::date IS NULL OR assessment_date<${endExclusive}::date)`,
    sql`SELECT ss.* FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id WHERE ss.license_id=${s.licenseId} AND a.class_id=${cls.id} AND (${startDate}::date IS NULL OR a.assessment_date>=${startDate}::date) AND (${endExclusive}::date IS NULL OR a.assessment_date<${endExclusive}::date)`,
    sql`SELECT * FROM report_notes WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM class_admin_items WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM class_officers WHERE license_id=${s.licenseId} AND class_id=${cls.id}`,
    sql`SELECT * FROM duty_roster WHERE license_id=${s.licenseId} AND class_id=${cls.id}`
   ]);
   const payload={
    version:'KelasKita-V7',
    created_at:new Date().toISOString(),
    attendance_storage:'hadir-default-exceptions-only',
    backup_scope:period.scope,
    period:period.scope==='period'?{start_month:period.startMonth,end_month:period.endMonth,months:period.months}:null,
    class:{id:cls.id,name:cls.name,academic_year:cls.academic_year},
    students,enrollments,subjects,schedules,teachingAssignments:assignments,academicSettings:academicSettings[0]||null,
    attendanceDays,attendanceRecords,subjectAttendanceSessions,subjectAttendanceRecords,
    notes,achievements,followups,agendas,assessments,scores,reports,admin,officers,duties
   };
   const safe=String(cls.name).replace(/[^A-Za-z0-9_-]+/g,'_');
   const suffix=period.scope==='period'?`${period.startMonth}_sampai_${period.endMonth}`:'Semua_Data';
   return new NextResponse(JSON.stringify(payload,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="Backup_KelasKita_${safe}_${suffix}.json"`,'Cache-Control':'no-store'}});
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
