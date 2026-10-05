import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';
import {normalizeNisn,normalizeText,parseScore,suggestMappings} from '@/lib/excel-smart';

function clean(v:any){return String(v??'').trim().replace(/\.0$/,'')}
function norm(v:any){return normalizeText(v)}
function identityFor(sheet:any){
  const rows=Array.isArray(sheet.rows)?sheet.rows:[];
  const guessed=suggestMappings(rows[0]?Object.keys(rows[0]):[],rows);
  const x=sheet.identity||sheet.suggestions||{};
  return{nisn:x.nisn||guessed.nisn||'',nis:x.nis||guessed.nis||'',name:x.name||guessed.name||''};
}
function rowIdentity(row:any,id:any){
  return{
    nisn:id.nisn?normalizeNisn(row[id.nisn]):'',
    nis:id.nis?clean(row[id.nis]):'',
    name:id.name?clean(row[id.name]):''
  };
}
async function resolveSubject(sql:any,licenseId:string,body:any,commit:boolean){
  if(body.subject_id){
    const r=await sql`SELECT id,name FROM subjects WHERE id=${body.subject_id} AND license_id=${licenseId} LIMIT 1`;
    if(r[0])return{subject:r[0],created:false};
  }
  const wanted=clean(body.subject_name);
  if(!wanted)return{subject:null,created:false};
  const r=await sql`SELECT id,name FROM subjects WHERE license_id=${licenseId} AND lower(name)=lower(${wanted}) LIMIT 1`;
  if(r[0])return{subject:r[0],created:false};
  if(!commit)return{subject:{id:null,name:wanted},created:false};
  const made=await sql`INSERT INTO subjects(license_id,name,teacher_name,mastery_score,is_active)
    VALUES(${licenseId},${wanted},(SELECT teacher_name FROM licenses WHERE id=${licenseId}),75,true)
    ON CONFLICT(license_id,name) DO UPDATE SET is_active=true,updated_at=now() RETURNING id,name`;
  return{subject:made[0],created:true};
}
async function getClass(sql:any,licenseId:string,name:string,academicYear:string,commit:boolean){
  const found=await sql`SELECT id,name,academic_year FROM classes WHERE license_id=${licenseId} AND academic_year=${academicYear} AND lower(name)=lower(${name}) LIMIT 1`;
  if(found[0])return{row:found[0],created:false};
  if(!commit)return{row:{id:null,name,academic_year:academicYear},created:false};
  const made=await sql`INSERT INTO classes(license_id,name,academic_year,is_homeroom,is_active)
    VALUES(${licenseId},${name},${academicYear},false,true)
    ON CONFLICT(license_id,academic_year,name) DO UPDATE SET is_active=true,updated_at=now()
    RETURNING id,name,academic_year`;
  return{row:made[0],created:true};
}

export async function POST(req:Request){
  const s=await getSession();if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    await ensureV5Schema();
    const body=await req.json();
    const sheets=(Array.isArray(body.sheets)?body.sheets:[]).filter((x:any)=>Array.isArray(x.rows)&&x.rows.length);
    if(!sheets.length)return NextResponse.json({message:'Tidak ada sheet kelas yang dapat diproses.'},{status:400});
    if(!body.subject_id&&!clean(body.subject_name))return NextResponse.json({message:'Pilih atau isi mata pelajaran untuk workbook ini.'},{status:400});
    const sql=db(),commit=body.action==='commit';
    const licenseRows=await sql`SELECT academic_year FROM licenses WHERE id=${s.licenseId} LIMIT 1`;
    const academicYear=clean(body.academic_year)||String(licenseRows[0]?.academic_year||'2026/2027');
    const resolvedSubject=await resolveSubject(sql,s.licenseId,body,commit);
    if(!resolvedSubject.subject)return NextResponse.json({message:'Mata pelajaran belum ditentukan.'},{status:400});
    const subjectId=resolvedSubject.subject.id as string|null;
    const subjectName=String(resolvedSubject.subject.name);

    const globalStudents=await sql`SELECT id,nis,nisn,name,status FROM students WHERE license_id=${s.licenseId}`;
    const byNisn=new Map<string,any>(),byNis=new Map<string,any>();
    (globalStudents as any[]).forEach(st=>{if(st.nisn)byNisn.set(clean(st.nisn),st);if(st.nis)byNis.set(clean(st.nis),st)});

    const duplicateNames=new Map<string,Set<string>>();
    for(const sh of sheets){
      const id=identityFor(sh),className=clean(sh.className||sh.classHint||sh.name);
      if(!className)continue;
      for(const row of sh.rows){
        const x=rowIdentity(row,id);if(!x.name)continue;
        const k=norm(x.name);if(!duplicateNames.has(k))duplicateNames.set(k,new Set());duplicateNames.get(k)!.add(className);
      }
    }
    const crossClassDuplicates=[...duplicateNames.entries()].filter(([,set])=>set.size>1).map(([name,set])=>({name,classes:[...set]}));

    let classesCount=0,newClasses=0,studentRows=0,newStudents=0,matchedStudents=0,values=0,newAssessments=0,conflicts=0;
    const sheetReview:any[]=[];

    for(const sh of sheets){
      const className=clean(sh.className||sh.classHint||sh.name);
      if(!className)continue;
      const id=identityFor(sh);
      if(!id.name&&!id.nis&&!id.nisn)continue;
      const cls=await getClass(sql,s.licenseId,className,academicYear,commit);
      if(cls.created)newClasses++;classesCount++;
      const classId=cls.row.id as string|null;

      let classStudents:any[]=[];
      if(classId){
        classStudents=await sql`SELECT st.id,st.nis,st.nisn,st.name FROM class_enrollments ce JOIN students st ON st.id=ce.student_id
          WHERE ce.license_id=${s.licenseId} AND ce.class_id=${classId} AND ce.status='Aktif' AND st.status<>'Dihapus'`;
      }
      const byName=new Map<string,any[]>();
      classStudents.forEach(st=>{const k=norm(st.name);byName.set(k,[...(byName.get(k)||[]),st])});

      const cols=(sh.assessments||sh.scoreColumns||[]).filter((x:any)=>x.include!==false&&x.column&&x.name);
      const existingAssessments=subjectId&&classId?await sql`SELECT id,name FROM assessments WHERE license_id=${s.licenseId} AND class_id=${classId} AND subject_id=${subjectId} AND semester=${body.semester||'Ganjil'}`:[];
      const existingAssessmentByName=new Map((existingAssessments as any[]).map(a=>[norm(a.name),a]));
      newAssessments+=cols.filter((x:any)=>!existingAssessmentByName.has(norm(x.name))).length;

      let sheetMatched=0,sheetNew=0,sheetValues=0;
      const prepared:any[]=[];
      for(const row of sh.rows){
        const x=rowIdentity(row,id);if(!x.name&&!x.nis&&!x.nisn)continue;
        studentRows++;
        let st:any=x.nisn?byNisn.get(x.nisn):null;
        if(!st&&x.nis)st=byNis.get(x.nis);
        if(!st&&x.name){
          const candidates=byName.get(norm(x.name))||[];
          if(candidates.length===1)st=candidates[0];
        }
        if(st){matchedStudents++;sheetMatched++}else{newStudents++;sheetNew++}
        for(const col of cols){if(parseScore(row[col.column])!==null){values++;sheetValues++}}
        prepared.push({row,x,student:st});
      }

      if(subjectId&&classId){
        const existingScores=await sql`SELECT ss.student_id,ss.score,ss.remedial_score,a.name assessment_name
          FROM student_scores ss JOIN assessments a ON a.id=ss.assessment_id
          WHERE ss.license_id=${s.licenseId} AND a.class_id=${classId} AND a.subject_id=${subjectId} AND a.semester=${body.semester||'Ganjil'}`;
        const scoreKeys=new Set((existingScores as any[]).map(x=>norm(x.assessment_name)+'::'+String(x.student_id)));
        for(const p of prepared)if(p.student)for(const col of cols)if(parseScore(p.row[col.column])!==null&&scoreKeys.has(norm(col.name)+'::'+p.student.id))conflicts++;
      }

      sheetReview.push({sheet:sh.name,className,rows:prepared.length,matched:sheetMatched,newStudents:sheetNew,values:sheetValues,assessments:cols.length});

      if(!commit)continue;
      if(!classId||!subjectId)throw new Error('Kelas atau mata pelajaran belum dapat dibuat.');
      await sql`INSERT INTO teaching_assignments(license_id,class_id,subject_id,is_active)
        VALUES(${s.licenseId},${classId},${subjectId},true)
        ON CONFLICT(license_id,class_id,subject_id) DO UPDATE SET is_active=true,updated_at=now()`;

      for(const p of prepared){
        let st=p.student;
        if(!st){
          const made=await sql`INSERT INTO students(license_id,nis,nisn,name,status)
            VALUES(${s.licenseId},${p.x.nis||null},${p.x.nisn||null},${p.x.name||'Tanpa Nama'},'Aktif') RETURNING id,nis,nisn,name`;
          st=made[0];
          if(st.nisn)byNisn.set(clean(st.nisn),st);if(st.nis)byNis.set(clean(st.nis),st);
        }
        await sql`UPDATE students SET status='Aktif',updated_at=now() WHERE id=${st.id} AND license_id=${s.licenseId}`;
        await sql`INSERT INTO class_enrollments(license_id,class_id,student_id,status)
          VALUES(${s.licenseId},${classId},${st.id},'Aktif')
          ON CONFLICT(class_id,student_id) DO UPDATE SET status='Aktif',left_at=NULL,updated_at=now()`;
        const key=norm(st.name);byName.set(key,[...(byName.get(key)||[]).filter(x=>x.id!==st.id),st]);
        p.student=st;
      }

      for(const col of cols){
        let assessment=existingAssessmentByName.get(norm(col.name));
        if(!assessment){
          const made=await sql`INSERT INTO assessments(license_id,class_id,subject_id,name,category,semester,assessment_date,max_score)
            VALUES(${s.licenseId},${classId},${subjectId},${col.name},${col.category||'Tugas Harian'},${body.semester||'Ganjil'},${col.date||new Date().toISOString().slice(0,10)}::date,${Number(col.maxScore||100)}) RETURNING id,name`;
          assessment=made[0];existingAssessmentByName.set(norm(col.name),assessment);
        }
        const payload:any[]=[];
        for(const p of prepared){
          const value=parseScore(p.row[col.column]);if(value===null||!p.student)continue;
          const max=Math.max(1,Number(col.maxScore||100));
          payload.push({student_id:String(p.student.id),score:Math.max(0,Math.min(max,value))});
        }
        if(payload.length){
          if(body.conflictStrategy==='overwrite'){
            await sql`INSERT INTO student_scores(license_id,assessment_id,student_id,score)
              SELECT ${s.licenseId},${assessment.id},st.id,x.score FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(student_id text,score numeric)
              JOIN students st ON st.id=x.student_id::uuid AND st.license_id=${s.licenseId}
              ON CONFLICT(assessment_id,student_id) DO UPDATE SET score=EXCLUDED.score,updated_at=now()`;
          }else{
            await sql`INSERT INTO student_scores(license_id,assessment_id,student_id,score)
              SELECT ${s.licenseId},${assessment.id},st.id,x.score FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(student_id text,score numeric)
              JOIN students st ON st.id=x.student_id::uuid AND st.license_id=${s.licenseId}
              ON CONFLICT(assessment_id,student_id) DO NOTHING`;
          }
        }
      }
    }

    const stats={classes:classesCount,newClasses,studentRows,newStudents,matchedStudents,values,newAssessments,conflicts,crossClassDuplicates:crossClassDuplicates.length,subjectName};
    if(!commit)return NextResponse.json({stats,sheets:sheetReview,crossClassDuplicates:crossClassDuplicates.slice(0,100)});

    const summary={...stats,sourceName:body.sourceName||null,semester:body.semester||'Ganjil',subject_id:subjectId,subject_name:subjectName};
    await sql`INSERT INTO import_batches(license_id,kind,source_name,summary) VALUES(${s.licenseId},'workbook-nilai',${body.sourceName||null},${JSON.stringify(summary)}::jsonb)`;
    return NextResponse.json({ok:true,...summary,sheets:sheetReview});
  }catch(e){
    console.error('workbook-import-failed',e);
    return NextResponse.json({message:'Workbook multi-kelas belum berhasil diimpor. Periksa kelas, nama siswa, mata pelajaran, dan kolom nilai.'},{status:500});
  }
}
