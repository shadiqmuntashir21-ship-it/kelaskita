import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
export const runtime='nodejs';

export async function GET(req:Request){
  const s=await getSession(); if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    const url=new URL(req.url); const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10); const sql=db();
    const [profile,students,attendance,notes,achievements,followUps,communications,agendas,subjects,schedules,assessments,scores,settings]=await Promise.all([
      sql`SELECT id,code,teacher_name,school_name,class_name,academic_year,expires_at FROM licenses WHERE id=${s.licenseId}`,
      sql`SELECT id,nis,nisn,name,gender,birth_place,birth_date,phone,address,guardian_name,guardian_phone,status FROM students WHERE license_id=${s.licenseId} AND status<>'Dihapus' ORDER BY name`,
      sql`SELECT ar.student_id,ar.status,ar.note FROM attendance_records ar JOIN attendance_days ad ON ad.id=ar.attendance_day_id WHERE ad.license_id=${s.licenseId} AND ad.attendance_date=${date}::date`,
      sql`SELECT n.id,n.student_id,st.name student_name,n.category,n.title,n.content,n.status,n.occurred_at FROM student_notes n JOIN students st ON st.id=n.student_id WHERE n.license_id=${s.licenseId} ORDER BY n.occurred_at DESC LIMIT 120`,
      sql`SELECT a.id,a.student_id,st.name student_name,a.title,a.category,a.level,a.organizer,a.rank,a.description,a.achieved_at FROM achievements a JOIN students st ON st.id=a.student_id WHERE a.license_id=${s.licenseId} ORDER BY a.achieved_at DESC LIMIT 120`,
      sql`SELECT f.id,f.student_id,COALESCE(st.name,'Umum') student_name,f.title,f.action,f.due_date,f.status,f.result,f.completed_at FROM follow_ups f LEFT JOIN students st ON st.id=f.student_id WHERE f.license_id=${s.licenseId} ORDER BY CASE WHEN f.status='Selesai' THEN 1 ELSE 0 END,f.due_date NULLS LAST LIMIT 150`,
      sql`SELECT c.id,c.student_id,st.name student_name,c.method,c.topic,c.result,c.communicated_at FROM parent_communications c JOIN students st ON st.id=c.student_id WHERE c.license_id=${s.licenseId} ORDER BY c.communicated_at DESC LIMIT 120`,
      sql`SELECT id,title,category,agenda_date,agenda_time,description,is_done FROM class_agendas WHERE license_id=${s.licenseId} ORDER BY agenda_date,agenda_time NULLS LAST LIMIT 150`,
      sql`SELECT id,name,teacher_name,mastery_score,is_active FROM subjects WHERE license_id=${s.licenseId} AND is_active=true ORDER BY name`,
      sql`SELECT sc.id,sc.subject_id,su.name subject_name,su.teacher_name,sc.day_name,sc.start_time,sc.end_time,sc.room FROM subject_schedules sc JOIN subjects su ON su.id=sc.subject_id WHERE sc.license_id=${s.licenseId} ORDER BY CASE sc.day_name WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 ELSE 7 END,sc.start_time`,
      sql`SELECT a.id,a.subject_id,su.name subject_name,a.name,a.category,a.semester,a.assessment_date,a.max_score FROM assessments a JOIN subjects su ON su.id=a.subject_id WHERE a.license_id=${s.licenseId} ORDER BY a.assessment_date DESC,a.created_at DESC`,
      sql`SELECT ss.id,ss.assessment_id,ss.student_id,ss.score,ss.remedial_score,ss.note FROM student_scores ss WHERE ss.license_id=${s.licenseId}`,
      sql`SELECT active_semester,calculation_mode,daily_weight,quiz_weight,semester_weight FROM academic_settings WHERE license_id=${s.licenseId}`
    ]);
    return NextResponse.json({profile:profile[0],students,attendance,notes,achievements,followUps,communications,agendas,subjects,schedules,assessments,scores,academicSettings:settings[0]||{active_semester:'Ganjil',calculation_mode:'Otomatis',daily_weight:30,quiz_weight:30,semester_weight:40}});
  }catch(e){console.error(e);return NextResponse.json({message:'Data kelas belum berhasil dimuat.'},{status:500})}
}
