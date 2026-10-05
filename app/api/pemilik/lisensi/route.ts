import {NextResponse}from'next/server';
import{getOwnerSession}from'@/lib/auth';
import{db}from'@/lib/db';
import{hashPin}from'@/lib/pin';
import{randomBytes,randomInt}from'crypto';
import{ensureV5Schema}from'@/lib/v5-schema';

function code(){return `KK-${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`}

export async function GET(){
 if(!await getOwnerSession())return NextResponse.json({message:'Tidak berwenang.'},{status:401});
 await ensureV5Schema();
 const sql=db();
 const rows=await sql`SELECT l.id,l.code,l.teacher_name,l.school_name,l.class_name,l.academic_year,l.is_active,l.expires_at,l.last_login_at,l.created_at,l.max_devices,l.usage_mode,l.v5_onboarding_completed,
   (SELECT COUNT(*)::int FROM device_sessions ds WHERE ds.license_id=l.id AND ds.revoked_at IS NULL AND ds.expires_at>now()) active_devices,
   (SELECT COUNT(*)::int FROM classes c WHERE c.license_id=l.id AND c.is_active=true) active_classes
   FROM licenses l ORDER BY l.created_at DESC`;
 return NextResponse.json({licenses:rows});
}

export async function POST(req:Request){
 if(!await getOwnerSession())return NextResponse.json({message:'Tidak berwenang.'},{status:401});
 try{
  await ensureV5Schema();
  const b=await req.json();
  if(!String(b.teacher_name||'').trim()||!String(b.school_name||'').trim())return NextResponse.json({message:'Nama guru dan sekolah wajib diisi.'},{status:400});
  const pin=String(b.pin||randomInt(100000,999999)),licenseCode=code(),sql=db();
  const r=await sql`INSERT INTO licenses(code,pin_hash,teacher_name,school_name,class_name,academic_year,expires_at,usage_mode,v5_onboarding_completed)
    VALUES(${licenseCode},${hashPin(pin)},${String(b.teacher_name).trim()},${String(b.school_name).trim()},${String(b.class_name||'Belum Diatur').trim()||'Belum Diatur'},${String(b.academic_year||'2026/2027').trim()},${b.expires_at||null}::timestamptz,'pending',false)
    RETURNING id,code`;
  return NextResponse.json({ok:true,id:r[0].id,code:r[0].code,pin});
 }catch(e){console.error(e);return NextResponse.json({message:'Lisensi belum berhasil dibuat.'},{status:500})}
}

export async function PATCH(req:Request){
 if(!await getOwnerSession())return NextResponse.json({message:'Tidak berwenang.'},{status:401});
 await ensureV5Schema();
 const b=await req.json(),sql=db();
 if(b.max_devices!==undefined){
  const m=Math.max(1,Math.min(20,Number(b.max_devices)||5));
  await sql`UPDATE licenses SET max_devices=${m},updated_at=now() WHERE id=${b.id}`;
  return NextResponse.json({ok:true,max_devices:m});
 }
 await sql`UPDATE licenses SET is_active=${!!b.is_active},updated_at=now() WHERE id=${b.id}`;
 return NextResponse.json({ok:true});
}
