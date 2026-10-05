import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import { db } from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';
import {resolveClassContext} from '@/lib/v5-context';
import {normalizeDate,normalizeGender,normalizeNisn,normalizePhone,normalizeText,suggestMappings} from '@/lib/excel-smart';

const fields=['nis','nisn','name','gender','class_name','birth_place','birth_date','address','guardian_name','guardian_phone','phone'] as const;
function str(v:any){return String(v??'').trim().replace(/\.0$/,'')}
function cleanNis(v:any){return str(v).replace(/\s+/g,'')}
function normName(v:any){return normalizeText(v).replace(/\b(muhammad|mohammad|muh|m)\.?\b/g,'muhammad').replace(/\s+/g,' ').trim()}
function resolveMapping(rows:any[],mapping:any){
  const headers=rows[0]?Object.keys(rows[0]):[];
  const guessed=suggestMappings(headers,rows);
  return{...guessed,...Object.fromEntries(Object.entries(mapping||{}).filter(([,v])=>!!v))};
}
function parseRow(row:any,mapping:any){
  const raw:any={};for(const f of fields)raw[f]=mapping?.[f]?row[mapping[f]]:'';
  return{
    nis:cleanNis(raw.nis),
    nisn:normalizeNisn(raw.nisn),
    name:str(raw.name),
    gender:normalizeGender(raw.gender),
    class_name:str(raw.class_name),
    birth_place:str(raw.birth_place),
    birth_date:normalizeDate(raw.birth_date),
    address:str(raw.address),
    guardian_name:str(raw.guardian_name),
    guardian_phone:normalizePhone(raw.guardian_phone),
    phone:normalizePhone(raw.phone)
  };
}
function makeMatcher(existing:any[],globalExact:any[]){
  const byNisn=new Map(globalExact.filter(x=>x.nisn).map(x=>[str(x.nisn),x]));
  const byNis=new Map(globalExact.filter(x=>x.nis).map(x=>[str(x.nis),x]));
  const byName=new Map<string,any[]>();
  existing.forEach(x=>{const k=normName(x.name);byName.set(k,[...(byName.get(k)||[]),x])});
  return(x:any)=>{
    if(x.nisn&&byNisn.has(x.nisn))return{student:byNisn.get(x.nisn),kind:'nisn'};
    if(x.nis&&byNis.has(x.nis))return{student:byNis.get(x.nis),kind:'nis'};
    const xs=byName.get(normName(x.name))||[];
    if(xs.length===1)return{student:xs[0],kind:'name'};
    if(xs.length>1)return{student:null,kind:'ambiguous'};
    return{student:null,kind:'new'};
  };
}
function mostCommonClass(parsed:any[]){
  const m=new Map<string,number>();
  parsed.map(x=>x.data.class_name).filter(Boolean).forEach(v=>m.set(v,(m.get(v)||0)+1));
  return[...m.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
}
export async function POST(req:Request){
  const s=await getSession();
  if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    await ensureV5Schema();
    const body=await req.json();
    if(!Array.isArray(body.rows)||!body.rows.length)return NextResponse.json({message:'Tidak ada baris Excel yang dapat diproses.'},{status:400});
    const mapping=resolveMapping(body.rows,body.mapping||{});
    if(!mapping.name)return NextResponse.json({message:'KelasKita belum menemukan kolom nama siswa. Pilih kolom nama pada langkah pemetaan.'},{status:400});
    const sql=db();
    const cls=await resolveClassContext(s.licenseId,body.class_id);
    if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
    const [existing,globalExact]=await Promise.all([
      sql`SELECT st.id,st.nis,st.nisn,st.name,st.gender,st.birth_place,st.birth_date,st.address,st.guardian_name,st.guardian_phone,st.phone,st.status FROM class_enrollments ce JOIN students st ON st.id=ce.student_id WHERE ce.license_id=${s.licenseId} AND ce.class_id=${cls.id} AND ce.status='Aktif' AND st.status<>'Dihapus'`,
      sql`SELECT id,nis,nisn,name,status FROM students WHERE license_id=${s.licenseId}`
    ]);
    const match=makeMatcher(existing as any[],globalExact as any[]);
    const parsed=body.rows.map((row:any,index:number)=>({index,data:parseRow(row,mapping)})).filter((x:any)=>x.data.name&&x.data.name.length>=2);
    const detectedClass=mostCommonClass(parsed);
    const review=parsed.map((entry:any)=>{
      const m=match(entry.data);
      return{row:entry.index+1,name:entry.data.name,nis:entry.data.nis,nisn:entry.data.nisn,status:m.kind,matched_id:m.student?.id||null,matched_name:m.student?.name||null};
    });
    const stats={
      total:review.length,new:review.filter((x:any)=>x.status==='new').length,
      exact:review.filter((x:any)=>x.status==='nisn'||x.status==='nis').length,
      nameReview:review.filter((x:any)=>x.status==='name').length,
      ambiguous:review.filter((x:any)=>x.status==='ambiguous').length,
      detectedClass
    };
    if(body.action!=='commit')return NextResponse.json({stats,review:review.slice(0,300),mapping});

    let inserted=0,updated=0,skipped=0;
    for(const entry of parsed){
      const x=entry.data,m=match(x);
      if(m.kind==='ambiguous'){skipped++;continue}
      if(m.kind==='name'&&!body.acceptNameMatches){skipped++;continue}
      if(m.student){
        await sql`INSERT INTO class_enrollments(license_id,class_id,student_id,status) VALUES(${s.licenseId},${cls.id},${m.student.id},'Aktif') ON CONFLICT(class_id,student_id) DO UPDATE SET status='Aktif',left_at=NULL,updated_at=now()`;
        if(body.strategy==='skip'){skipped++;continue}
        await sql`UPDATE students SET
          nis=COALESCE(NULLIF(${x.nis},''),nis),nisn=COALESCE(NULLIF(${x.nisn},''),nisn),name=COALESCE(NULLIF(${x.name},''),name),
          gender=COALESCE(NULLIF(${x.gender},''),gender),birth_place=COALESCE(NULLIF(${x.birth_place},''),birth_place),
          birth_date=COALESCE(NULLIF(${x.birth_date},'')::date,birth_date),address=COALESCE(NULLIF(${x.address},''),address),
          guardian_name=COALESCE(NULLIF(${x.guardian_name},''),guardian_name),guardian_phone=COALESCE(NULLIF(${x.guardian_phone},''),guardian_phone),
          phone=COALESCE(NULLIF(${x.phone},''),phone),status='Aktif',updated_at=now()
          WHERE id=${m.student.id} AND license_id=${s.licenseId}`;
        updated++;
      }else{
        try{
          const made=await sql`INSERT INTO students(license_id,nis,nisn,name,gender,birth_place,birth_date,address,guardian_name,guardian_phone,phone)
          VALUES(${s.licenseId},${x.nis||null},${x.nisn||null},${x.name},${x.gender||null},${x.birth_place||null},${x.birth_date||null}::date,${x.address||null},${x.guardian_name||null},${x.guardian_phone||null},${x.phone||null}) RETURNING id`;
          await sql`INSERT INTO class_enrollments(license_id,class_id,student_id,status) VALUES(${s.licenseId},${cls.id},${made[0].id},'Aktif') ON CONFLICT(class_id,student_id) DO UPDATE SET status='Aktif',left_at=NULL,updated_at=now()`;
          inserted++;
        }catch(e:any){
          const msg=String(e?.message||'').toLowerCase();
          if(msg.includes('unique'))skipped++;else throw e;
        }
      }
    }
    // Pada V5 nama kelas tidak lagi menimpa lisensi. Kelas aktif tetap ditentukan oleh workspace.
    const summary={total:parsed.length,inserted,updated,skipped,detectedClass:body.applyDetectedClass===false?'':(detectedClass||cls.name),class_id:cls.id,sourceName:body.sourceName||null};
    await sql`INSERT INTO import_batches(license_id,kind,source_name,summary) VALUES(${s.licenseId},'siswa',${body.sourceName||null},${JSON.stringify(summary)}::jsonb)`;
    return NextResponse.json({ok:true,...summary});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:'Impor siswa belum berhasil. KelasKita sudah membaca Excel, tetapi ada data yang tidak dapat disimpan. Periksa preview terutama nama dan tanggal lahir.'},{status:500});
  }
}
