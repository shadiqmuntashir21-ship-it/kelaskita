import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {resolveClassContext} from '@/lib/v5-context';

export async function POST(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json();if(!b.name)return NextResponse.json({message:'Nama siswa wajib diisi.'},{status:400});
  const cls=await resolveClassContext(s.licenseId,b.class_id);if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
  const sql=db();
  let existing:any=null;
  if(b.nisn){const r=await sql`SELECT id FROM students WHERE license_id=${s.licenseId} AND nisn=${b.nisn} LIMIT 1`;existing=r[0]}
  if(!existing&&b.nis){const r=await sql`SELECT id FROM students WHERE license_id=${s.licenseId} AND nis=${b.nis} LIMIT 1`;existing=r[0]}
  let studentId:string;
  if(existing){
   studentId=String(existing.id);
   await sql`UPDATE students SET status='Aktif',name=COALESCE(NULLIF(${b.name},''),name),gender=COALESCE(NULLIF(${b.gender||''},''),gender),
     birth_place=COALESCE(NULLIF(${b.birth_place||''},''),birth_place),birth_date=COALESCE(NULLIF(${b.birth_date||''},'')::date,birth_date),
     guardian_name=COALESCE(NULLIF(${b.guardian_name||''},''),guardian_name),guardian_phone=COALESCE(NULLIF(${b.guardian_phone||''},''),guardian_phone),
     phone=COALESCE(NULLIF(${b.phone||''},''),phone),address=COALESCE(NULLIF(${b.address||''},''),address),updated_at=now()
     WHERE id=${studentId} AND license_id=${s.licenseId}`;
  }else{
   const r=await sql`INSERT INTO students(license_id,nis,nisn,name,gender,birth_place,birth_date,guardian_name,guardian_phone,phone,address)
    VALUES(${s.licenseId},${b.nis||null},${b.nisn||null},${b.name},${b.gender||null},${b.birth_place||null},${b.birth_date||null}::date,${b.guardian_name||null},${b.guardian_phone||null},${b.phone||null},${b.address||null}) RETURNING id`;
   studentId=String(r[0].id);
  }
  await sql`INSERT INTO class_enrollments(license_id,class_id,student_id,status) VALUES(${s.licenseId},${cls.id},${studentId},'Aktif')
    ON CONFLICT(class_id,student_id) DO UPDATE SET status='Aktif',left_at=NULL,updated_at=now()`;
  await sql`INSERT INTO activity_logs(license_id,action,entity_type,entity_id,metadata) VALUES(${s.licenseId},'Menambah siswa','siswa',${studentId},${JSON.stringify({name:b.name,class_id:String(cls.id)})}::jsonb)`;
  return NextResponse.json({ok:true,id:studentId,class_id:cls.id});
 }catch(e:any){console.error(e);const msg=String(e?.message||'').toLowerCase();if(msg.includes('unique'))return NextResponse.json({message:'NIS atau NISN sudah digunakan.'},{status:409});return NextResponse.json({message:'Siswa belum berhasil ditambahkan.'},{status:500})}
}
export async function PATCH(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{const b=await req.json();const sql=db();const r=await sql`UPDATE students SET nis=${b.nis||null},nisn=${b.nisn||null},name=${b.name},gender=${b.gender||null},birth_place=${b.birth_place||null},birth_date=${b.birth_date||null}::date,guardian_name=${b.guardian_name||null},guardian_phone=${b.guardian_phone||null},phone=${b.phone||null},address=${b.address||null},status=${b.status||'Aktif'},updated_at=now() WHERE id=${b.id} AND license_id=${s.licenseId} AND (${b.expected_updated_at||null}::timestamptz IS NULL OR updated_at=${b.expected_updated_at||null}::timestamptz) RETURNING updated_at`;if(!r[0])return NextResponse.json({message:'Data siswa sudah berubah dari perangkat lain. Muat ulang sebelum menyimpan.'},{status:409});return NextResponse.json({ok:true,updated_at:r[0].updated_at})}catch(e:any){console.error(e);if(String(e?.message||'').toLowerCase().includes('unique'))return NextResponse.json({message:'NIS atau NISN sudah digunakan.'},{status:409});return NextResponse.json({message:'Data siswa belum berhasil diperbarui.'},{status:500})}
}
export async function DELETE(req:Request){
 const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const b=await req.json();const cls=await resolveClassContext(s.licenseId,b.class_id);const sql=db();
  if(cls)await sql`UPDATE class_enrollments SET status='Keluar',left_at=now(),updated_at=now() WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND student_id=${b.id}`;
  const left=await sql`SELECT 1 FROM class_enrollments WHERE license_id=${s.licenseId} AND student_id=${b.id} AND status='Aktif' LIMIT 1`;
  if(!left[0])await sql`UPDATE students SET status='Dihapus',updated_at=now() WHERE id=${b.id} AND license_id=${s.licenseId}`;
  return NextResponse.json({ok:true});
 }catch(e){console.error(e);return NextResponse.json({message:'Siswa belum berhasil dihapus.'},{status:500})}
}
