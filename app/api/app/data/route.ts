import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
export const runtime='nodejs';
export async function GET(req:Request){
  const s=await getSession(); if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    const url=new URL(req.url); const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10); const sql=db();
    const [profile,students,attendance,notes,achievements,followUps,communications,agendas]=await Promise.all([
      sql`SELECT id,code,teacher_name,school_name,class_name,academic_year,expires_at FROM licenses WHERE id=${s.licenseId}`,
      sql`SELECT id,nis,nisn,name,gender,birth_place,birth_date,phone,address,guardian_name,guardian_phone,status FROM students WHERE license_id=${s.licenseId} AND status<>'Dihapus' ORDER BY name`,
      sql`SELECT ar.student_id,ar.status,ar.note FROM attendance_records ar JOIN attendance_days ad ON ad.id=ar.attendance_day_id WHERE ad.license_id=${s.licenseId} AND ad.attendance_date=${date}::date`,
      sql`SELECT n.id,n.student_id,s.name student_name,n.category,n.title,n.content,n.status,n.occurred_at FROM student_notes n JOIN students s ON s.id=n.student_id WHERE n.license_id=${s.licenseId} ORDER BY n.occurred_at DESC LIMIT 80`,
      sql`SELECT a.id,a.student_id,s.name student_name,a.title,a.category,a.level,a.organizer,a.rank,a.description,a.achieved_at FROM achievements a JOIN students s ON s.id=a.student_id WHERE a.license_id=${s.licenseId} ORDER BY a.achieved_at DESC LIMIT 80`,
      sql`SELECT f.id,f.student_id,COALESCE(s.name,'Umum') student_name,f.title,f.action,f.due_date,f.status,f.result,f.completed_at FROM follow_ups f LEFT JOIN students s ON s.id=f.student_id WHERE f.license_id=${s.licenseId} ORDER BY CASE WHEN f.status='Selesai' THEN 1 ELSE 0 END,f.due_date NULLS LAST LIMIT 100`,
      sql`SELECT c.id,c.student_id,s.name student_name,c.method,c.topic,c.result,c.communicated_at FROM parent_communications c JOIN students s ON s.id=c.student_id WHERE c.license_id=${s.licenseId} ORDER BY c.communicated_at DESC LIMIT 80`,
      sql`SELECT id,title,category,agenda_date,agenda_time,description,is_done FROM class_agendas WHERE license_id=${s.licenseId} ORDER BY agenda_date,agenda_time NULLS LAST LIMIT 100`
    ]);
    return NextResponse.json({profile:profile[0],students,attendance,notes,achievements,followUps,communications,agendas});
  }catch(e){console.error(e);return NextResponse.json({message:'Data kelas belum berhasil dimuat.'},{status:500})}
}
