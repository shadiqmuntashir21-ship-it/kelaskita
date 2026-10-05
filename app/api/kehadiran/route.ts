import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {resolveClassContext} from '@/lib/v5-context';
export async function GET(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const u=new URL(req.url),date=u.searchParams.get('date')||new Date().toISOString().slice(0,10),month=u.searchParams.get('month')||date.slice(0,7);
  const cls=await resolveClassContext(s.licenseId,u.searchParams.get('class_id'));if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
  const sql=db();
  const day=await sql`SELECT id,attendance_date FROM attendance_days WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND attendance_date=${date}::date LIMIT 1`;
  const records=day[0]?await sql`SELECT student_id,status,note FROM attendance_records WHERE attendance_day_id=${day[0].id}`:[];
  const from=month+'-01';
  const dates=await sql`SELECT ad.attendance_date::text date,COUNT(ar.id)::int record_count
    FROM attendance_days ad LEFT JOIN attendance_records ar ON ar.attendance_day_id=ad.id
    WHERE ad.license_id=${s.licenseId} AND ad.class_id=${cls.id}
      AND ad.attendance_date>=${from}::date AND ad.attendance_date<(${from}::date+interval '1 month')
    GROUP BY ad.id,ad.attendance_date ORDER BY ad.attendance_date`;
  return NextResponse.json({exists:!!day[0],day:day[0]||null,records,dates});
 }catch(e){console.error(e);return NextResponse.json({message:'Kehadiran belum dapat dimuat.'},{status:500})}
}

export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const {date,records,class_id}=await req.json();if(!date||!Array.isArray(records))return NextResponse.json({message:'Data kehadiran tidak lengkap.'},{status:400});
  const cls=await resolveClassContext(s.licenseId,class_id);if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
  const sql=db();
  const d=await sql`INSERT INTO attendance_days(license_id,class_id,attendance_date) VALUES(${s.licenseId},${cls.id},${date}::date)
    ON CONFLICT(license_id,class_id,attendance_date) DO UPDATE SET attendance_date=EXCLUDED.attendance_date RETURNING id`;
  const dayId=d[0].id;
  if(records.length){await sql`INSERT INTO attendance_records(attendance_day_id,student_id,status,note)
    SELECT ${dayId},st.id,x.status,x.note FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb) AS x(student_id text,status text,note text)
    JOIN students st ON st.id=x.student_id::uuid AND st.license_id=${s.licenseId} AND st.status<>'Dihapus'
    JOIN class_enrollments ce ON ce.student_id=st.id AND ce.class_id=${cls.id} AND ce.license_id=${s.licenseId} AND ce.status='Aktif'
    ON CONFLICT(attendance_day_id,student_id) DO UPDATE SET status=EXCLUDED.status,note=EXCLUDED.note,updated_at=now()`}
  await sql`INSERT INTO activity_logs(license_id,action,entity_type,entity_id,metadata) VALUES(${s.licenseId},'Menyimpan kehadiran','kehadiran',${dayId},${JSON.stringify({date,count:records.length,class_id:String(cls.id)})}::jsonb)`;
  return NextResponse.json({ok:true});
 }catch(e){console.error(e);return NextResponse.json({message:'Kehadiran belum berhasil disimpan.'},{status:500})}
}
