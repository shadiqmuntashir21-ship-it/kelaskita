import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {resolveClassContext} from '@/lib/v5-context';
import ExcelJS from 'exceljs';
import {analyzeWorkbook,normalizeDate,normalizeGender,normalizeNisn,normalizePhone} from '@/lib/excel-smart';
export const runtime='nodejs';

const headers=['NIS','NISN','Nama','Jenis Kelamin','Tempat Lahir','Tanggal Lahir','Alamat','Nama Wali Siswa','No. Wali Siswa','No. Siswa'];
export async function GET(){
  if(!await getSession())return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Siswa');
  ws.addRow(headers);ws.addRow(['24001','009881001','Nama Siswa','Laki-laki','Palu','2010-01-15','Alamat siswa','Nama Wali','081234567890','081234567891']);
  ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F2D6B'}};
  ws.columns.forEach(c=>c.width=20);
  const b=Buffer.from(await wb.xlsx.writeBuffer());
  return new NextResponse(new Uint8Array(b),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="Template_Impor_Siswa_KelasKita.xlsx"'}});
}
function s(v:any){return String(v??'').trim().replace(/\.0$/,'')}

export async function POST(req:Request){
  const session=await getSession();if(!session)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    const form=await req.formData(),file=form.get('file');
    if(!(file instanceof File))return NextResponse.json({message:'File Excel belum dipilih.'},{status:400});
    const classId=String(form.get('class_id')||'');
    const cls=await resolveClassContext(session.licenseId,classId||null);
    if(!cls)return NextResponse.json({message:'Kelas aktif belum dipilih. Gunakan Impor Excel dari dalam ruang kelas.'},{status:400});

    const sheets=await analyzeWorkbook(await file.arrayBuffer(),'siswa'),sheet=sheets[0];
    if(!sheet)return NextResponse.json({message:'Tidak menemukan tabel siswa yang dapat dibaca.'},{status:400});
    const m=sheet.suggestions||{};
    if(!m.name)return NextResponse.json({message:'Nama siswa belum terdeteksi. Gunakan Impor Excel baru untuk memilih kolom nama secara manual.'},{status:400});
    const rows=sheet.rows.map((r:any)=>({
      nis:m.nis?s(r[m.nis]):'',nisn:m.nisn?normalizeNisn(r[m.nisn]):'',name:s(r[m.name]),
      gender:m.gender?normalizeGender(r[m.gender]):'',birth_place:m.birth_place?s(r[m.birth_place]):'',
      birth_date:m.birth_date?normalizeDate(r[m.birth_date]):'',address:m.address?s(r[m.address]):'',
      guardian_name:m.guardian_name?s(r[m.guardian_name]):'',guardian_phone:m.guardian_phone?normalizePhone(r[m.guardian_phone]):'',
      phone:m.phone?normalizePhone(r[m.phone]):''
    })).filter((x:any)=>x.name);
    if(!rows.length)return NextResponse.json({message:'Tidak ada nama siswa yang terbaca dari Excel.'},{status:400});

    const sql=db();let inserted=0,linked=0,skipped=0;
    for(const x of rows){
      let student:any=null;
      if(x.nisn){const r=await sql`SELECT id FROM students WHERE license_id=${session.licenseId} AND nisn=${x.nisn} LIMIT 1`;student=r[0]}
      if(!student&&x.nis){const r=await sql`SELECT id FROM students WHERE license_id=${session.licenseId} AND nis=${x.nis} LIMIT 1`;student=r[0]}
      if(!student){
        try{
          const made=await sql`INSERT INTO students(license_id,nis,nisn,name,gender,birth_place,birth_date,address,guardian_name,guardian_phone,phone)
            VALUES(${session.licenseId},${x.nis||null},${x.nisn||null},${x.name},${x.gender||null},${x.birth_place||null},${x.birth_date||null}::date,${x.address||null},${x.guardian_name||null},${x.guardian_phone||null},${x.phone||null})
            RETURNING id`;
          student=made[0];inserted++;
        }catch(e:any){
          if(String(e?.message||'').toLowerCase().includes('unique')){skipped++;continue}
          throw e;
        }
      }
      const en=await sql`INSERT INTO class_enrollments(license_id,class_id,student_id,status)
        VALUES(${session.licenseId},${cls.id},${student.id},'Aktif')
        ON CONFLICT(class_id,student_id) DO UPDATE SET status='Aktif',left_at=NULL,updated_at=now()
        RETURNING id`;
      if(en[0])linked++;
    }
    return NextResponse.json({ok:true,total:rows.length,inserted,linked,skipped,detectedClass:sheet.classHint||'',activeClass:cls.name,sheet:sheet.name});
  }catch(e){console.error(e);return NextResponse.json({message:'Excel belum berhasil diimpor. Gunakan menu Impor Excel untuk melihat preview dan pemetaan otomatis.'},{status:500})}
}
