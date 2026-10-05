import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import { db } from '@/lib/db';
import { ensureV4Schema } from '@/lib/v4-schema';
export const runtime='nodejs';

const defaults=[
  ['profil-siswa','Data siswa lengkap','Data Kelas',10],
  ['struktur-kelas','Struktur organisasi kelas','Data Kelas',20],
  ['jadwal-pelajaran','Jadwal pelajaran','Jadwal',30],
  ['jadwal-piket','Jadwal piket','Jadwal',40],
  ['kehadiran','Rekap kehadiran','Kehadiran',50],
  ['nilai','Rekap nilai siswa','Akademik',60],
  ['prestasi','Rekap prestasi','Pendampingan',70],
  ['catatan','Catatan wali kelas','Pendampingan',80],
  ['tindak-lanjut','Tindak lanjut siswa','Pendampingan',90],
  ['catatan-rapor','Catatan rapor','Pelaporan',100],
  ['laporan-bulanan','Laporan bulanan','Pelaporan',110],
  ['laporan-semester','Laporan semester','Pelaporan',120],
];

export async function GET(req:Request){
  const s=await getSession(); if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    await ensureV4Schema();
    const url=new URL(req.url); const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10); const sql=db();
    for(const [key,label,category,sort] of defaults){await sql`INSERT INTO class_admin_items(license_id,item_key,label,category,sort_order) VALUES(${s.licenseId},${key},${label},${category},${sort}) ON CONFLICT(license_id,item_key) DO NOTHING`}
    const [profile,students,attendance,attendanceSummary,notes,achievements,followUps,agendas,subjects,schedules,assessments,scores,settings,reportNotes,adminItems,officers,duties,archives]=await Promise.all([
      sql`SELECT id,code,teacher_name,school_name,class_name,academic_year,expires_at,onboarding_completed,max_devices FROM licenses WHERE id=${s.licenseId}`,
      sql`SELECT id,nis,nisn,name,gender,birth_place,birth_date,phone,address,guardian_name,guardian_phone,status,updated_at FROM students WHERE license_id=${s.licenseId} AND status<>'Dihapus' ORDER BY CASE WHEN status='Aktif' THEN 0 ELSE 1 END,name`,
      sql`SELECT ar.student_id,ar.status,ar.note FROM attendance_records ar JOIN attendance_days ad ON ad.id=ar.attendance_day_id WHERE ad.license_id=${s.licenseId} AND ad.attendance_date=${date}::date`,
      sql`SELECT st.id student_id,COUNT(ar.id) total,COUNT(*) FILTER(WHERE ar.status='Hadir') hadir,COUNT(*) FILTER(WHERE ar.status='Sakit') sakit,COUNT(*) FILTER(WHERE ar.status='Izin') izin,COUNT(*) FILTER(WHERE ar.status='Alfa') alfa,COUNT(*) FILTER(WHERE ar.status='Terlambat') terlambat FROM students st LEFT JOIN attendance_records ar ON ar.student_id=st.id LEFT JOIN attendance_days ad ON ad.id=ar.attendance_day_id AND ad.license_id=${s.licenseId} WHERE st.license_id=${s.licenseId} AND st.status<>'Dihapus' GROUP BY st.id`,
      sql`SELECT n.id,n.student_id,st.name student_name,n.category,n.title,n.content,n.status,n.occurred_at FROM student_notes n JOIN students st ON st.id=n.student_id WHERE n.license_id=${s.licenseId} ORDER BY n.occurred_at DESC LIMIT 200`,
      sql`SELECT a.id,a.student_id,st.name student_name,a.title,a.category,a.level,a.organizer,a.rank,a.description,a.achieved_at FROM achievements a JOIN students st ON st.id=a.student_id WHERE a.license_id=${s.licenseId} ORDER BY a.achieved_at DESC LIMIT 200`,
      sql`SELECT f.id,f.student_id,COALESCE(st.name,'Umum') student_name,f.title,f.action,f.due_date,f.status,f.result,f.completed_at FROM follow_ups f LEFT JOIN students st ON st.id=f.student_id WHERE f.license_id=${s.licenseId} ORDER BY CASE WHEN f.status='Selesai' THEN 1 ELSE 0 END,f.due_date NULLS LAST LIMIT 200`,
      sql`SELECT id,title,category,agenda_date,agenda_time,description,is_done FROM class_agendas WHERE license_id=${s.licenseId} ORDER BY agenda_date,agenda_time NULLS LAST LIMIT 200`,
      sql`SELECT id,name,teacher_name,mastery_score,is_active,updated_at FROM subjects WHERE license_id=${s.licenseId} AND is_active=true ORDER BY name`,
      sql`SELECT sc.id,sc.subject_id,su.name subject_name,su.teacher_name,sc.day_name,sc.start_time,sc.end_time,sc.room,sc.updated_at FROM subject_schedules sc JOIN subjects su ON su.id=sc.subject_id WHERE sc.license_id=${s.licenseId} ORDER BY CASE sc.day_name WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 ELSE 7 END,sc.start_time`,
      sql`SELECT a.id,a.subject_id,su.name subject_name,a.name,a.category,a.semester,a.assessment_date,a.max_score,a.updated_at FROM assessments a JOIN subjects su ON su.id=a.subject_id WHERE a.license_id=${s.licenseId} ORDER BY a.assessment_date DESC,a.created_at DESC`,
      sql`SELECT ss.id,ss.assessment_id,ss.student_id,ss.score,ss.remedial_score,ss.note,ss.updated_at FROM student_scores ss WHERE ss.license_id=${s.licenseId}`,
      sql`SELECT active_semester,calculation_mode,daily_weight,quiz_weight,semester_weight FROM academic_settings WHERE license_id=${s.licenseId}`,
      sql`SELECT id,student_id,academic_year,semester,content,updated_at FROM report_notes WHERE license_id=${s.licenseId}`,
      sql`SELECT id,item_key,label,category,is_completed,notes,sort_order FROM class_admin_items WHERE license_id=${s.licenseId} ORDER BY sort_order,label`,
      sql`SELECT o.id,o.student_id,st.name student_name,o.role_name,o.sort_order FROM class_officers o JOIN students st ON st.id=o.student_id WHERE o.license_id=${s.licenseId} ORDER BY o.sort_order,o.role_name`,
      sql`SELECT d.id,d.student_id,st.name student_name,d.day_name,d.task_name FROM duty_roster d JOIN students st ON st.id=d.student_id WHERE d.license_id=${s.licenseId} ORDER BY CASE d.day_name WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 ELSE 7 END,st.name`,
      sql`SELECT id,academic_year,class_name,closed_at FROM class_year_archives WHERE license_id=${s.licenseId} ORDER BY closed_at DESC`
    ]);
    return NextResponse.json({profile:profile[0],students,attendance,attendanceSummary,notes,achievements,followUps,agendas,subjects,schedules,assessments,scores,academicSettings:settings[0]||{active_semester:'Ganjil',calculation_mode:'Otomatis',daily_weight:30,quiz_weight:30,semester_weight:40},reportNotes,adminItems,officers,duties,archives});
  }catch(e){console.error(e);return NextResponse.json({message:'Data kelas belum berhasil dimuat.'},{status:500})}
}
