import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import { db } from '@/lib/db';
import { ensureV4Schema } from '@/lib/v4-schema';

function str(v:any){return String(v??'').trim()}
function norm(v:any){return str(v).toLowerCase().replace(/\s+/g,' ')}
function num(v:any){
  if(v===null||v===undefined||v==='')return null;
  const n=Number(String(v).replace(',','.'));
  return Number.isFinite(n)?n:null;
}
function makeMatcher(existing:any[]){
  const byNisn=new Map(existing.filter(x=>x.nisn).map(x=>[str(x.nisn),x]));
  const byNis=new Map(existing.filter(x=>x.nis).map(x=>[str(x.nis),x]));
  const byName=new Map<string,any[]>();
  existing.forEach(x=>{const k=norm(x.name);byName.set(k,[...(byName.get(k)||[]),x])});
  return(row:any,id:any)=>{
    const a=id?.nisn?str(row[id.nisn]):'';
    const b=id?.nis?str(row[id.nis]):'';
    const c=id?.name?norm(row[id.name]):'';
    if(a&&byNisn.has(a))return{student:byNisn.get(a),kind:'nisn'};
    if(b&&byNis.has(b))return{student:byNis.get(b),kind:'nis'};
    const xs=c?(byName.get(c)||[]):[];
    if(xs.length===1)return{student:xs[0],kind:'name'};
    if(xs.length>1)return{student:null,kind:'ambiguous'};
    return{student:null,kind:'unmatched'};
  };
}
export async function POST(req:Request){
  const s=await getSession();
  if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    await ensureV4Schema();
    const body=await req.json();
    const cols=(body.assessments||[]).filter((x:any)=>x.include!==false&&x.column&&x.name);
    if(!body.subject_id||!body.semester||!Array.isArray(body.rows)||!cols.length)return NextResponse.json({message:'Mapel, semester, dan kolom nilai wajib dipilih.'},{status:400});
    const sql=db();
    const own=await sql`SELECT id,name FROM subjects WHERE id=${body.subject_id} AND license_id=${s.licenseId} LIMIT 1`;
    if(!own[0])return NextResponse.json({message:'Mata pelajaran tidak ditemukan.'},{status:404});
    const students=await sql`SELECT id,nis,nisn,name FROM students WHERE license_id=${s.licenseId} AND status<>'Dihapus'`;
    const match=makeMatcher(students as any[]);
    const assessments=await sql`SELECT id,name,category,max_score,assessment_date FROM assessments WHERE license_id=${s.licenseId} AND subject_id=${body.subject_id} AND semester=${body.semester}`;
    const existingByName=new Map((assessments as any[]).map(a=>[norm(a.name),a]));
    const scores=await sql`SELECT ss.student_id,ss.score,ss.remedial_score,a.name assessment_name FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id WHERE ss.license_id=${s.licenseId} AND a.subject_id=${body.subject_id} AND a.semester=${body.semester}`;
    const scoreMap=new Map<string,any>();
    (scores as any[]).forEach(sc=>scoreMap.set(`${norm(sc.assessment_name)}::${sc.student_id}`,sc));

    const matches:any[]=[],unmatched:any[]=[],ambiguous:any[]=[],nameReview:any[]=[],conflicts:any[]=[];
    let values=0;
    body.rows.forEach((row:any,i:number)=>{
      const m=match(row,body.identity||{});
      const sourceName=(body.identity?.name&&str(row[body.identity.name]))||`Baris ${i+1}`;
      if(!m.student){(m.kind==='ambiguous'?ambiguous:unmatched).push({row:i+1,name:sourceName});return}
      if(m.kind==='name')nameReview.push({row:i+1,name:sourceName,studentId:m.student.id,matchedName:m.student.name});
      matches.push({rowIndex:i,studentId:m.student.id,kind:m.kind});
      cols.forEach((col:any)=>{
        const v=num(row[col.column]);if(v===null)return;
        values++;
        const key=`${norm(col.name)}::${m.student.id}`;
        const old=scoreMap.get(key);
        if(old)conflicts.push({key,row:i+1,studentId:m.student.id,studentName:m.student.name,assessmentName:col.name,existingScore:old.remedial_score??old.score,newScore:v});
      });
    });
    const stats={
      rows:body.rows.length,matched:matches.length,unmatched:unmatched.length,ambiguous:ambiguous.length,nameReview:nameReview.length,
      values,conflicts:conflicts.length,newAssessments:cols.filter((c:any)=>!existingByName.has(norm(c.name))).length
    };
    if(body.action!=='commit')return NextResponse.json({stats,unmatched:unmatched.slice(0,100),ambiguous:ambiguous.slice(0,100),nameReview:nameReview.slice(0,100),conflicts:conflicts.slice(0,300)});

    const allowName=!!body.acceptNameMatches;
    const overwrite=new Set<string>(Array.isArray(body.overwriteKeys)?body.overwriteKeys:[]);
    let imported=0,kept=0,createdAssessments=0;
    for(const col of cols){
      let assessment=existingByName.get(norm(col.name));
      if(!assessment){
        const inserted=await sql`INSERT INTO assessments(license_id,subject_id,name,category,semester,assessment_date,max_score)
        VALUES(${s.licenseId},${body.subject_id},${col.name},${col.category||'Tugas Harian'},${body.semester},${col.date||new Date().toISOString().slice(0,10)}::date,${Number(col.maxScore||100)}) RETURNING id,name`;
        assessment=inserted[0];existingByName.set(norm(col.name),assessment);createdAssessments++;
      }
      const payload:any[]=[];
      body.rows.forEach((row:any)=>{
        const m=match(row,body.identity||{});
        if(!m.student||m.kind==='ambiguous'||m.kind==='unmatched'||(m.kind==='name'&&!allowName))return;
        const v=num(row[col.column]);if(v===null)return;
        const key=`${norm(col.name)}::${m.student.id}`;
        const old=scoreMap.get(key);
        if(old&&body.conflictStrategy==='keep'){kept++;return}
        if(old&&body.conflictStrategy==='review'&&!overwrite.has(key)){kept++;return}
        const max=Number(col.maxScore||100);
        payload.push({student_id:String(m.student.id),score:Math.max(0,Math.min(max,v))});
      });
      if(payload.length){
        await sql`INSERT INTO student_scores(license_id,assessment_id,student_id,score)
        SELECT ${s.licenseId},${assessment.id},st.id,x.score FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(student_id text,score numeric)
        JOIN students st ON st.id=x.student_id::uuid AND st.license_id=${s.licenseId} AND st.status<>'Dihapus'
        ON CONFLICT(assessment_id,student_id) DO UPDATE SET score=EXCLUDED.score,updated_at=now()`;
        imported+=payload.length;
      }
    }
    const summary={subject_id:body.subject_id,semester:body.semester,rows:body.rows.length,imported,kept,createdAssessments,unmatched:unmatched.length,ambiguous:ambiguous.length,sourceName:body.sourceName||null};
    await sql`INSERT INTO import_batches(license_id,kind,source_name,summary) VALUES(${s.licenseId},'nilai',${body.sourceName||null},${JSON.stringify(summary)}::jsonb)`;
    return NextResponse.json({ok:true,...summary});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:'Impor nilai belum berhasil. Periksa pemetaan siswa, kolom nilai, dan format angka.'},{status:500});
  }
}
