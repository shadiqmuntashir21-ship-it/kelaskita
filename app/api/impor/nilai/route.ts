import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import { db } from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';
import {resolveClassContext} from '@/lib/v5-context';
import {normalizeNisn,normalizeText,parseScore,suggestMappings} from '@/lib/excel-smart';

function str(v:any){return String(v??'').trim().replace(/\.0$/,'')}
function norm(v:any){return normalizeText(v)}
function resolveIdentity(rows:any[],identity:any){
  const guessed=suggestMappings(rows[0]?Object.keys(rows[0]):[],rows);
  return{
    nisn:identity?.nisn||guessed.nisn||'',
    nis:identity?.nis||guessed.nis||'',
    name:identity?.name||guessed.name||''
  };
}
function makeMatcher(existing:any[]){
  const byNisn=new Map(existing.filter(x=>x.nisn).map(x=>[str(x.nisn),x]));
  const byNis=new Map(existing.filter(x=>x.nis).map(x=>[str(x.nis),x]));
  const byName=new Map<string,any[]>();
  existing.forEach(x=>{const k=norm(x.name);byName.set(k,[...(byName.get(k)||[]),x])});
  return(row:any,id:any)=>{
    const a=id?.nisn?normalizeNisn(row[id.nisn]):'',b=id?.nis?str(row[id.nis]):'',c=id?.name?norm(row[id.name]):'';
    if(a&&byNisn.has(a))return{student:byNisn.get(a),kind:'nisn'};
    if(b&&byNis.has(b))return{student:byNis.get(b),kind:'nis'};
    const xs=c?(byName.get(c)||[]):[];
    if(xs.length===1)return{student:xs[0],kind:'name'};
    if(xs.length>1)return{student:null,kind:'ambiguous'};
    return{student:null,kind:'unmatched'};
  };
}
async function resolveSubject(sql:any,licenseId:string,body:any,commit:boolean){
  if(body.subject_id){
    const rows=await sql`SELECT id,name FROM subjects WHERE id=${body.subject_id} AND license_id=${licenseId} LIMIT 1`;
    if(rows[0])return{subject:rows[0],created:false};
  }
  const wanted=str(body.subject_name);
  if(!wanted)return{subject:null,created:false};
  const rows=await sql`SELECT id,name FROM subjects WHERE license_id=${licenseId} AND lower(name)=lower(${wanted}) LIMIT 1`;
  if(rows[0])return{subject:rows[0],created:false};
  if(!commit)return{subject:{id:null,name:wanted},created:false};
  const created=await sql`INSERT INTO subjects(license_id,name,mastery_score,is_active) VALUES(${licenseId},${wanted},75,true) RETURNING id,name`;
  return{subject:created[0],created:true};
}
export async function POST(req:Request){
  const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    await ensureV5Schema();
    const body=await req.json();
    const cols=(body.assessments||[]).filter((x:any)=>x.include!==false&&x.column&&x.name);
    if(!body.semester||!Array.isArray(body.rows)||!body.rows.length||!cols.length)return NextResponse.json({message:'Semester dan minimal satu kolom nilai wajib dipilih.'},{status:400});
    if(!body.subject_id&&!str(body.subject_name))return NextResponse.json({message:'Pilih mata pelajaran atau isi nama mata pelajaran baru.'},{status:400});
    const identity=resolveIdentity(body.rows,body.identity||{});
    if(!identity.name&&!identity.nis&&!identity.nisn)return NextResponse.json({message:'KelasKita belum menemukan identitas siswa. Pilih kolom Nama, NIS, atau NISN.'},{status:400});

    const sql=db(),isCommit=body.action==='commit';
    const cls=await resolveClassContext(s.licenseId,body.class_id);
    if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih.'},{status:400});
    const resolved=await resolveSubject(sql,s.licenseId,body,isCommit);
    if(!resolved.subject)return NextResponse.json({message:'Mata pelajaran tidak ditemukan.'},{status:404});
    const subjectId=resolved.subject.id as string|null,subjectName=String(resolved.subject.name);

    const students=await sql`SELECT st.id,st.nis,st.nisn,st.name FROM class_enrollments ce JOIN students st ON st.id=ce.student_id WHERE ce.license_id=${s.licenseId} AND ce.class_id=${cls.id} AND ce.status='Aktif' AND st.status<>'Dihapus'`;
    const match=makeMatcher(students as any[]);
    const assessments=subjectId?await sql`SELECT id,name,category,max_score,assessment_date FROM assessments WHERE license_id=${s.licenseId} AND class_id=${cls.id} AND subject_id=${subjectId} AND semester=${body.semester}`:[];
    const existingByName=new Map((assessments as any[]).map(a=>[norm(a.name),a]));
    const scores=subjectId?await sql`SELECT ss.student_id,ss.score,ss.remedial_score,a.name assessment_name FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id WHERE ss.license_id=${s.licenseId} AND a.class_id=${cls.id} AND a.subject_id=${subjectId} AND a.semester=${body.semester}`:[];
    const scoreMap=new Map<string,any>();(scores as any[]).forEach(sc=>scoreMap.set(`${norm(sc.assessment_name)}::${sc.student_id}`,sc));

    const matches:any[]=[],unmatched:any[]=[],ambiguous:any[]=[],nameReview:any[]=[],conflicts:any[]=[];let values=0;
    body.rows.forEach((row:any,i:number)=>{
      const m=match(row,identity),sourceName=(identity.name&&str(row[identity.name]))||`Baris ${i+1}`;
      if(!m.student){(m.kind==='ambiguous'?ambiguous:unmatched).push({row:i+1,name:sourceName});return}
      if(m.kind==='name')nameReview.push({row:i+1,name:sourceName,studentId:m.student.id,matchedName:m.student.name});
      matches.push({rowIndex:i,studentId:m.student.id,kind:m.kind});
      cols.forEach((col:any)=>{
        const v=parseScore(row[col.column]);if(v===null)return;values++;
        const key=`${norm(col.name)}::${m.student.id}`,old=scoreMap.get(key);
        if(old)conflicts.push({key,row:i+1,studentId:m.student.id,studentName:m.student.name,assessmentName:col.name,existingScore:old.remedial_score??old.score,newScore:v});
      });
    });
    const stats={
      rows:body.rows.length,matched:matches.length,unmatched:unmatched.length,ambiguous:ambiguous.length,nameReview:nameReview.length,
      values,conflicts:conflicts.length,newAssessments:cols.filter((c:any)=>!existingByName.has(norm(c.name))).length,
      subjectName,subjectWillCreate:!subjectId
    };
    if(!isCommit)return NextResponse.json({stats,identity,unmatched:unmatched.slice(0,120),ambiguous:ambiguous.slice(0,120),nameReview:nameReview.slice(0,120),conflicts:conflicts.slice(0,350)});

    if(!subjectId)throw new Error('Mata pelajaran belum berhasil dibuat.');
    await sql`INSERT INTO teaching_assignments(license_id,class_id,subject_id,is_active) VALUES(${s.licenseId},${cls.id},${subjectId},true) ON CONFLICT(license_id,class_id,subject_id) DO UPDATE SET is_active=true,updated_at=now()`;
    const allowName=body.acceptNameMatches!==false,overwrite=new Set<string>(Array.isArray(body.overwriteKeys)?body.overwriteKeys:[]);
    let imported=0,kept=0,createdAssessments=0;
    for(const col of cols){
      let assessment=existingByName.get(norm(col.name));
      if(!assessment){
        const inserted=await sql`INSERT INTO assessments(license_id,class_id,subject_id,name,category,semester,assessment_date,max_score)
        VALUES(${s.licenseId},${cls.id},${subjectId},${col.name},${col.category||'Tugas Harian'},${body.semester},${col.date||new Date().toISOString().slice(0,10)}::date,${Number(col.maxScore||100)}) RETURNING id,name`;
        assessment=inserted[0];existingByName.set(norm(col.name),assessment);createdAssessments++;
      }
      const payload:any[]=[];
      body.rows.forEach((row:any)=>{
        const m=match(row,identity);if(!m.student||m.kind==='ambiguous'||m.kind==='unmatched'||(m.kind==='name'&&!allowName))return;
        const v=parseScore(row[col.column]);if(v===null)return;
        const key=`${norm(col.name)}::${m.student.id}`,old=scoreMap.get(key);
        if(old&&body.conflictStrategy==='keep'){kept++;return}
        if(old&&body.conflictStrategy==='review'&&!overwrite.has(key)){kept++;return}
        const max=Math.max(1,Number(col.maxScore||100));payload.push({student_id:String(m.student.id),score:Math.max(0,Math.min(max,v))});
      });
      if(payload.length){
        await sql`INSERT INTO student_scores(license_id,assessment_id,student_id,score)
        SELECT ${s.licenseId},${assessment.id},st.id,x.score FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(student_id text,score numeric)
        JOIN students st ON st.id=x.student_id::uuid AND st.license_id=${s.licenseId} AND st.status<>'Dihapus'
        ON CONFLICT(assessment_id,student_id) DO UPDATE SET score=EXCLUDED.score,updated_at=now()`;
        imported+=payload.length;
      }
    }
    const summary={subject_id:subjectId,subject_name:subjectName,class_id:cls.id,class_name:cls.name,semester:body.semester,rows:body.rows.length,imported,kept,createdAssessments,createdSubject:resolved.created,unmatched:unmatched.length,ambiguous:ambiguous.length,sourceName:body.sourceName||null};
    await sql`INSERT INTO import_batches(license_id,kind,source_name,summary) VALUES(${s.licenseId},'nilai',${body.sourceName||null},${JSON.stringify(summary)}::jsonb)`;
    return NextResponse.json({ok:true,...summary});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:'Impor nilai belum berhasil diselesaikan. Periksa preview siswa, mata pelajaran, dan kolom nilai lalu coba lagi.'},{status:500});
  }
}
