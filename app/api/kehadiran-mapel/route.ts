import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';
import {resolveClassContext} from '@/lib/v5-context';

async function validateAssignment(sql:ReturnType<typeof db>,licenseId:string,classId:string,subjectId:string){
 const r=await sql`SELECT ta.id FROM teaching_assignments ta
  WHERE ta.license_id=${licenseId} AND ta.class_id=${classId} AND ta.subject_id=${subjectId} AND ta.is_active=true LIMIT 1`;
 return !!r[0];
}

export async function GET(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();
  const u=new URL(req.url),date=u.searchParams.get('date')||new Date().toISOString().slice(0,10),month=u.searchParams.get('month')||date.slice(0,7),subjectId=u.searchParams.get('subject_id')||'';
  const cls=await resolveClassContext(s.licenseId,u.searchParams.get('class_id'));if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
  if(!subjectId)return NextResponse.json({message:'Mata pelajaran belum dipilih.'},{status:400});
  const sql=db();
  if(!await validateAssignment(sql,s.licenseId,String(cls.id),subjectId))return NextResponse.json({message:'Mata pelajaran ini tidak terhubung ke kelas aktif.'},{status:403});
  const sess=await sql`SELECT id,meeting_date,meeting_no,note FROM subject_attendance_sessions
    WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND subject_id=${subjectId} AND meeting_date=${date}::date AND meeting_no=1 LIMIT 1`;
  const records=sess[0]?await sql`SELECT student_id,status,note FROM subject_attendance_records WHERE session_id=${sess[0].id}`:[];
  const from=month+'-01';
  const dates=await sql`SELECT sas.meeting_date::text date,COUNT(sar.id)::int record_count
    FROM subject_attendance_sessions sas
    LEFT JOIN subject_attendance_records sar ON sar.session_id=sas.id
    WHERE sas.license_id=${s.licenseId} AND sas.class_id=${cls.id} AND sas.subject_id=${subjectId}
      AND sas.meeting_date>=${from}::date AND sas.meeting_date<(${from}::date+interval '1 month')
    GROUP BY sas.id,sas.meeting_date ORDER BY sas.meeting_date`;
  return NextResponse.json({exists:!!sess[0],session:sess[0]||null,records,dates});
 }catch(e){console.error(e);return NextResponse.json({message:'Kehadiran pertemuan belum dapat dimuat.'},{status:500})}
}

export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  await ensureV5Schema();
  const b=await req.json();if(!b.date||!b.subject_id||!Array.isArray(b.records))return NextResponse.json({message:'Data kehadiran pertemuan belum lengkap.'},{status:400});
  const cls=await resolveClassContext(s.licenseId,b.class_id);if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
  const sql=db();
  if(!await validateAssignment(sql,s.licenseId,String(cls.id),String(b.subject_id)))return NextResponse.json({message:'Mata pelajaran ini tidak terhubung ke kelas aktif.'},{status:403});
  const sess=await sql`INSERT INTO subject_attendance_sessions(license_id,class_id,subject_id,meeting_date,meeting_no,note)
    VALUES(${s.licenseId},${cls.id},${b.subject_id},${b.date}::date,${Number(b.meeting_no||1)},${b.note||null})
    ON CONFLICT(license_id,class_id,subject_id,meeting_date,meeting_no)
    DO UPDATE SET note=EXCLUDED.note,updated_at=now()
    RETURNING id`;
  const sessionId=sess[0].id;
  if(b.records.length){
   await sql`INSERT INTO subject_attendance_records(session_id,student_id,status,note)
    SELECT ${sessionId},st.id,x.status,x.note
    FROM jsonb_to_recordset(${JSON.stringify(b.records)}::jsonb) AS x(student_id text,status text,note text)
    JOIN students st ON st.id=x.student_id::uuid AND st.license_id=${s.licenseId} AND st.status<>'Dihapus'
    JOIN class_enrollments ce ON ce.student_id=st.id AND ce.license_id=${s.licenseId} AND ce.class_id=${cls.id} AND ce.status='Aktif'
    ON CONFLICT(session_id,student_id) DO UPDATE SET status=EXCLUDED.status,note=EXCLUDED.note,updated_at=now()`;
  }
  await sql`INSERT INTO activity_logs(license_id,action,entity_type,entity_id,metadata)
    VALUES(${s.licenseId},'Menyimpan kehadiran pertemuan','kehadiran-mapel',${String(sessionId)},${JSON.stringify({class_id:String(cls.id),subject_id:String(b.subject_id),date:b.date,count:b.records.length})}::jsonb)`;
  return NextResponse.json({ok:true,session_id:sessionId});
 }catch(e){console.error(e);return NextResponse.json({message:'Kehadiran pertemuan belum berhasil disimpan.'},{status:500})}
}
