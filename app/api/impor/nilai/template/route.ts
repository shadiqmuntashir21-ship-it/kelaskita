import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import ExcelJS from 'exceljs';
export const runtime='nodejs';

export async function GET(){
  const s=await getSession();
  if(!s)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('Nilai');
  ws.addRow(['NIS','NISN','Nama','Tugas 1','Tugas 2','UH 1','Proyek','PTS']);
  ws.addRow(['25001','0100260001','Ahmad Fauzan',80,82,78,86,79]);
  ws.addRow(['25002','0100260002','Siti Rahma',90,91,88,92,90]);
  ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
  ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F2D6B'}};
  ws.columns.forEach(c=>c.width=18);
  ws.getColumn(3).width=26;
  const info=wb.addWorksheet('Petunjuk');
  info.addRows([
    ['TEMPLATE IMPOR NILAI KELASKITA'],
    ['Gunakan NISN atau NIS agar pencocokan siswa paling aman.'],
    ['Nama boleh digunakan sebagai bantuan pencocokan.'],
    ['Kolom setelah identitas siswa dapat diberi nama sesuai penilaian yang sudah berjalan.'],
    ['Kategori Tugas/UH/PTS/PAS akan dipetakan saat proses impor.']
  ]);
  info.getRow(1).font={bold:true,size:16};
  const b=Buffer.from(await wb.xlsx.writeBuffer());
  return new NextResponse(new Uint8Array(b),{headers:{
    'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition':'attachment; filename="Template_Impor_Nilai_KelasKita.xlsx"'
  }});
}
