import {NextResponse} from 'next/server';
import {getOwnerSession} from '@/lib/auth';
import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';
export const runtime='nodejs';

const DEFAULT_FREE_LIMIT=1024*1024*1024;
function limitBytes(){
 const n=Number(process.env.NEON_LOGICAL_SIZE_LIMIT_BYTES||DEFAULT_FREE_LIMIT);
 return Number.isFinite(n)&&n>0?n:DEFAULT_FREE_LIMIT;
}

export async function GET(){
 if(!await getOwnerSession())return NextResponse.json({message:'Tidak berwenang.'},{status:401});
 try{
  await ensureV5Schema();const sql=db();
  const [size,licenses,students,scores,dailyAttendance,subjectAttendance,classes,logs,largest]=await Promise.all([
   sql`SELECT pg_database_size(current_database())::bigint AS bytes`,
   sql`SELECT COUNT(*)::int n FROM licenses WHERE is_active=true`,
   sql`SELECT COUNT(DISTINCT ce.student_id)::int n FROM class_enrollments ce JOIN classes c ON c.id=ce.class_id WHERE ce.status='Aktif' AND c.is_active=true`,
   sql`SELECT COUNT(*)::bigint n FROM student_scores`,
   sql`SELECT COUNT(*)::bigint n FROM attendance_records`,
   sql`SELECT COUNT(*)::bigint n FROM subject_attendance_records`,
   sql`SELECT COUNT(*)::int n FROM classes WHERE is_active=true`,
   sql`SELECT COUNT(*)::bigint n FROM activity_logs`,
   sql`SELECT relname AS name,pg_total_relation_size(relid)::bigint AS bytes FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 8`
  ]);
  const used=Number(size[0]?.bytes||0),limit=limitBytes(),percent=Math.min(100,used/limit*100);
  const status=percent>=88?'kritis':percent>=70?'perhatian':'aman';
  return NextResponse.json({
   target_teachers:200,status,used_bytes:used,limit_bytes:limit,percent,
   active_teachers:Number(licenses[0]?.n||0),active_students:Number(students[0]?.n||0),active_classes:Number(classes[0]?.n||0),
   scores:Number(scores[0]?.n||0),attendance:Number(dailyAttendance[0]?.n||0)+Number(subjectAttendance[0]?.n||0),
   daily_attendance:Number(dailyAttendance[0]?.n||0),subject_attendance:Number(subjectAttendance[0]?.n||0),
   activity_logs:Number(logs[0]?.n||0),largest_tables:largest
  });
 }catch(e){console.error(e);return NextResponse.json({message:'Kapasitas sistem belum dapat dibaca.'},{status:500})}
}

export async function POST(req:Request){
 if(!await getOwnerSession())return NextResponse.json({message:'Tidak berwenang.'},{status:401});
 try{
  const b=await req.json();if(b.action!=='cleanup_logs')return NextResponse.json({message:'Aksi tidak dikenali.'},{status:400});
  const sql=db();
  const removed=await sql`WITH deleted AS (DELETE FROM activity_logs WHERE created_at<now()-interval '90 days' RETURNING id) SELECT COUNT(*)::int n FROM deleted`;
  return NextResponse.json({ok:true,removed:Number(removed[0]?.n||0),retention_days:90});
 }catch(e){console.error(e);return NextResponse.json({message:'Log lama belum dapat dibersihkan.'},{status:500})}
}
