import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {db} from '@/lib/db';
import {decryptSecret} from '@/lib/secret';
import {ensureV5Schema} from '@/lib/v5-schema';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function safeEqual(a:string,b:string){
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length&&timingSafeEqual(x,y);
}
function monthDate(month:string){
  const m:Record<string,string>={Juli:'2026-07-01',Agustus:'2026-08-01',September:'2026-09-01',Oktober:'2026-10-01',November:'2026-11-01',Desember:'2026-12-01'};
  return m[month]||'2026-10-01';
}
async function json(res:Response){
  const j=await res.json().catch(()=>({message:'Respons server tidak dapat dibaca.'}));
  if(!res.ok)throw new Error(j.message||('HTTP '+res.status));
  return j;
}

export async function GET(req:Request){
 try{
  const token=new URL(req.url).searchParams.get('token')||'';
  const expected=process.env.NAHDA_MAINTENANCE_TOKEN||'';
  if(!expected||!safeEqual(token,expected))return NextResponse.json({message:'Tidak berwenang.'},{status:401});

  const raw=process.env.NAHDA_IMPORT_PAYLOAD;
  if(!raw)return NextResponse.json({message:'Payload maintenance tidak tersedia.'},{status:503});
  const payload=JSON.parse(raw);
  if(payload.licenseCode!=='KK-6C0B-C99F'||payload.teacherName!=='Nahdah Ulfa'||payload.subjectName!=='Bahasa Arab'||payload.sheets?.length!==4){
    return NextResponse.json({message:'Payload maintenance tidak sesuai target.'},{status:400});
  }

  await ensureV5Schema();
  const sql=db();
  const target=await sql`SELECT l.id,l.code,l.teacher_name,l.academic_year,o.issued_pin_enc
    FROM licenses l LEFT JOIN purchase_orders o ON o.license_id=l.id
    WHERE l.code=${payload.licenseCode}
    ORDER BY o.created_at DESC NULLS LAST LIMIT 1`;
  const lic:any=target[0];
  if(!lic||String(lic.teacher_name).trim()!==payload.teacherName)return NextResponse.json({message:'Lisensi target tidak cocok.'},{status:409});

  const done=await sql`SELECT summary FROM import_batches
    WHERE license_id=${lic.id} AND kind='workbook-nilai' AND source_name=${payload.sourceName}
      AND summary->>'subject_name'=${payload.subjectName}
      AND summary->>'classes'='4' AND summary->>'studentRows'='101' AND summary->>'values'='176'
    ORDER BY created_at DESC LIMIT 1`;
  if(done[0])return NextResponse.json({ok:true,already_done:true,summary:done[0].summary});

  const pin=decryptSecret(lic.issued_pin_enc||'');
  if(!pin)return NextResponse.json({message:'PIN lisensi target tidak tersedia.'},{status:409});

  const origin='https://kelaskita-bersama.vercel.app';
  const login=await fetch(origin+'/api/masuk',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'KelasKita Owner Maintenance'},body:JSON.stringify({code:lic.code,pin}),cache:'no-store'});
  await json(login);
  const getSetCookie=(login.headers as any).getSetCookie?.bind(login.headers);
  const rawCookies:string[]=getSetCookie?getSetCookie():[];
  const cookie=rawCookies.map(x=>x.split(';')[0]).join('; ');
  if(!cookie.includes('kk_sesi=')||!cookie.includes('kk_device_id='))return NextResponse.json({message:'Sesi maintenance belum terbentuk.'},{status:500});

  const headers={'Content-Type':'application/json','Cookie':cookie,'User-Agent':'KelasKita Owner Maintenance'};
  const app=await json(await fetch(origin+'/api/app/data',{headers:{Cookie:cookie,'User-Agent':'KelasKita Owner Maintenance'},cache:'no-store'}));
  const oldClasses=(app.classes||[]).map((c:any)=>({id:String(c.id),name:String(c.name)}));

  const backupSummary:any[]=[];
  for(const cls of oldClasses){
    const backup=await json(await fetch(origin+'/api/manajemen-data?class_id='+encodeURIComponent(cls.id)+'&backup=1',{headers:{Cookie:cookie,'User-Agent':'KelasKita Owner Maintenance'},cache:'no-store'}));
    backupSummary.push({className:cls.name,students:backup.students?.length||0,attendance:backup.attendanceRecords?.length||0,notes:backup.notes?.length||0,assessments:backup.assessments?.length||0,scores:backup.scores?.length||0});
  }

  for(const cls of oldClasses){
    await json(await fetch(origin+'/api/manajemen-data',{method:'DELETE',headers,body:JSON.stringify({class_id:cls.id,confirm:'KOSONGKAN '+cls.name}),cache:'no-store'}));
    await json(await fetch(origin+'/api/ruang-kerja',{method:'POST',headers,body:JSON.stringify({action:'archive_class',class_id:cls.id}),cache:'no-store'}));
  }

  const sheets=payload.sheets.map((sh:any)=>({
    name:sh.className,
    className:sh.className,
    rows:sh.rows.map((r:any)=>{
      const row:any={NAMA:r.name};
      for(const month of sh.scoreMonths)row[String(month).toUpperCase()]=r.scores?.[month]??'';
      return row;
    }),
    identity:{name:'NAMA',nis:'',nisn:''},
    assessments:sh.scoreMonths.map((month:string)=>({
      column:month.toUpperCase(),name:'Formatif '+month,category:'Tugas Harian',
      date:monthDate(month),maxScore:100,include:true
    }))
  }));

  const imported=await json(await fetch(origin+'/api/impor/workbook',{method:'POST',headers,body:JSON.stringify({
    action:'commit',sourceName:payload.sourceName,academic_year:lic.academic_year,
    subject_name:payload.subjectName,semester:'Ganjil',conflictStrategy:'overwrite',sheets
  }),cache:'no-store'}));

  await json(await fetch(origin+'/api/onboarding',{method:'PATCH',headers,body:JSON.stringify({
    usage_mode:'mapel',completed:true,subject_name:payload.subjectName,
    teaching_classes:payload.sheets.map((s:any)=>s.className),academic_year:lic.academic_year
  }),cache:'no-store'}));

  const verify=await json(await fetch(origin+'/api/app/data',{headers:{Cookie:cookie,'User-Agent':'KelasKita Owner Maintenance'},cache:'no-store'}));
  const finalClasses=(verify.classes||[]).filter((c:any)=>['2A','2B','2C','2D'].includes(String(c.name)));
  return NextResponse.json({
    ok:true,already_done:false,
    reset:{oldClasses:oldClasses.length,backupSummary},
    imported,
    verify:{usageMode:verify.profile?.usage_mode,classes:finalClasses.map((c:any)=>c.name),activeClass:verify.profile?.class_name}
  });
 }catch(e:any){
  console.error('nahda-maintenance-orchestrator-failed',e);
  return NextResponse.json({message:'Maintenance Nahda belum selesai.',detail:String(e?.message||e).slice(0,500)},{status:500});
 }
}
