import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
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
    const sheets=await analyzeWorkbook(await file.arrayBuffer(),'siswa'),sheet=sheets[0];
    if(!sheet)return NextResponse.json({message:'Tidak menemukan tabel siswa yang dapat dibaca.'},{status:400});
    const m=sheet.suggestions||{};
    if(!m.name)return NextResponse.json({message:'Nama siswa belum terdeteksi. Gunakan Impor Excel baru untuk memilih kolom nama secara manual.'},{status:400});
    const rows=sheet.rows.map((r:any)=>({
      nis:m.nis?s(r[m.nis]):null,nisn:m.nisn?normalizeNisn(r[m.nisn]):null,name:s(r[m.name]),
      gender:m.gender?normalizeGender(r[m.gender]):null,birth_place:m.birth_place?s(r[m.birth_place]):null,
      birth_date:m.birth_date?normalizeDate(r[m.birth_date]):null,address:m.address?s(r[m.address]):null,
      guardian_name:m.guardian_name?s(r[m.guardian_name]):null,guardian_phone:m.guardian_phone?normalizePhone(r[m.guardian_phone]):null,
      phone:m.phone?normalizePhone(r[m.phone]):null
    })).filter((x:any)=>x.name);
    if(!rows.length)return NextResponse.json({message:'Tidak ada nama siswa yang terbaca dari Excel.'},{status:400});
    const sql=db();
    const inserted=await sql`INSERT INTO students(license_id,nis,nisn,name,gender,birth_place,birth_date,address,guardian_name,guardian_phone,phone)
      SELECT ${session.licenseId},x.nis,x.nisn,x.name,x.gender,x.birth_place,NULLIF(x.birth_date,'')::date,x.address,x.guardian_name,x.guardian_phone,x.phone
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(nis text,nisn text,name text,gender text,birth_place text,birth_date text,address text,guardian_name text,guardian_phone text,phone text)
      ON CONFLICT DO NOTHING RETURNING id`;
    if(sheet.classHint)await sql`UPDATE licenses SET class_name=${sheet.classHint},updated_at=now() WHERE id=${session.licenseId}`;
    return NextResponse.json({ok:true,total:rows.length,inserted:inserted.length,skipped:rows.length-inserted.length,detectedClass:sheet.classHint||'',sheet:sheet.name});
  }catch(e){console.error(e);return NextResponse.json({message:'Excel belum berhasil diimpor. Gunakan menu Impor Excel untuk melihat preview dan pemetaan otomatis.'},{status:500})}
}
