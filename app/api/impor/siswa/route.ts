import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import { db } from '@/lib/db';
import { ensureV4Schema } from '@/lib/v4-schema';

const fields=['nis','nisn','name','gender','birth_place','birth_date','address','guardian_name','guardian_phone','phone'] as const;
function str(v:any){return String(v??'').trim()}
function norm(v:any){return str(v).toLowerCase().replace(/\s+/g,' ')}
function parseRow(row:any,mapping:any){
  const x:any={};
  for(const f of fields) x[f]=mapping?.[f]?str(row[mapping[f]]):'';
  return x;
}
function makeMatcher(existing:any[]){
  const byNisn=new Map(existing.filter(x=>x.nisn).map(x=>[str(x.nisn),x]));
  const byNis=new Map(existing.filter(x=>x.nis).map(x=>[str(x.nis),x]));
  const byName=new Map<string,any[]>();
  existing.forEach(x=>{const k=norm(x.name);byName.set(k,[...(byName.get(k)||[]),x])});
  return (x:any)=>{
    if(x.nisn&&byNisn.has(x.nisn)) return {student:byNisn.get(x.nisn),kind:'nisn'};
    if(x.nis&&byNis.has(x.nis)) return {student:byNis.get(x.nis),kind:'nis'};
    const names=byName.get(norm(x.name))||[];
    if(names.length===1) return {student:names[0],kind:'name'};
    if(names.length>1) return {student:null,kind:'ambiguous'};
    return {student:null,kind:'new'};
  };
}
export async function POST(req:Request){
  const s=await getSession();
  if(!s) return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    await ensureV4Schema();
    const body=await req.json();
    if(!Array.isArray(body.rows)||!body.mapping?.name) return NextResponse.json({message:'Pemetaan kolom Nama wajib diisi.'},{status:400});
    const sql=db();
    const existing=await sql`SELECT id,nis,nisn,name,gender,birth_place,birth_date,address,guardian_name,guardian_phone,phone,status FROM students WHERE license_id=${s.licenseId} AND status<>'Dihapus'`;
    const match=makeMatcher(existing as any[]);
    const parsed=body.rows.map((row:any,i:number)=>({index:i,data:parseRow(row,body.mapping)})).filter((x:any)=>x.data.name);
    const review=parsed.map((entry:any)=>{
      const m=match(entry.data);
      return {row:entry.index+1,name:entry.data.name,nis:entry.data.nis,nisn:entry.data.nisn,status:m.kind,matched_id:m.student?.id||null,matched_name:m.student?.name||null};
    });
    const stats={
      total:review.length,
      new:review.filter((x:any)=>x.status==='new').length,
      exact:review.filter((x:any)=>x.status==='nisn'||x.status==='nis').length,
      nameReview:review.filter((x:any)=>x.status==='name').length,
      ambiguous:review.filter((x:any)=>x.status==='ambiguous').length,
    };
    if(body.action!=='commit') return NextResponse.json({stats,review:review.slice(0,250)});
    let inserted=0,updated=0,skipped=0;
    for(const entry of parsed){
      const x=entry.data;
      const m=match(x);
      if(m.kind==='ambiguous'){skipped++;continue}
      if(m.kind==='name'&&!body.acceptNameMatches){skipped++;continue}
      if(m.student){
        if(body.strategy==='skip'){skipped++;continue}
        await sql`UPDATE students SET
          nis=COALESCE(NULLIF(${x.nis},''),nis),
          nisn=COALESCE(NULLIF(${x.nisn},''),nisn),
          name=COALESCE(NULLIF(${x.name},''),name),
          gender=COALESCE(NULLIF(${x.gender},''),gender),
          birth_place=COALESCE(NULLIF(${x.birth_place},''),birth_place),
          birth_date=COALESCE(NULLIF(${x.birth_date},'')::date,birth_date),
          address=COALESCE(NULLIF(${x.address},''),address),
          guardian_name=COALESCE(NULLIF(${x.guardian_name},''),guardian_name),
          guardian_phone=COALESCE(NULLIF(${x.guardian_phone},''),guardian_phone),
          phone=COALESCE(NULLIF(${x.phone},''),phone),
          updated_at=now()
          WHERE id=${m.student.id} AND license_id=${s.licenseId}`;
        updated++;
      }else{
        try{
          await sql`INSERT INTO students(license_id,nis,nisn,name,gender,birth_place,birth_date,address,guardian_name,guardian_phone,phone)
          VALUES(${s.licenseId},${x.nis||null},${x.nisn||null},${x.name},${x.gender||null},${x.birth_place||null},${x.birth_date||null}::date,${x.address||null},${x.guardian_name||null},${x.guardian_phone||null},${x.phone||null})`;
          inserted++;
        }catch{skipped++}
      }
    }
    const summary={total:parsed.length,inserted,updated,skipped,sourceName:body.sourceName||null};
    await sql`INSERT INTO import_batches(license_id,kind,source_name,summary) VALUES(${s.licenseId},'siswa',${body.sourceName||null},${JSON.stringify(summary)}::jsonb)`;
    return NextResponse.json({ok:true,...summary});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:'Impor siswa belum berhasil diselesaikan. Periksa format tanggal, NIS, dan NISN.'},{status:500});
  }
}
