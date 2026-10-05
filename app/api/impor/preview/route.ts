import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {analyzeWorkbook, type ImportKind} from '@/lib/excel-smart';
export const runtime='nodejs';

export async function POST(req:Request){
  if(!await getSession())return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    const form=await req.formData();
    const file=form.get('file');
    const kind=(String(form.get('kind')||'siswa')==='nilai'?'nilai':'siswa') as ImportKind;
    if(!(file instanceof File))return NextResponse.json({message:'File Excel belum dipilih.'},{status:400});
    const name=file.name.toLowerCase();
    if(!name.endsWith('.xlsx')&&!name.endsWith('.xlsm'))return NextResponse.json({message:'Gunakan file Excel .xlsx atau .xlsm.'},{status:400});
    const sheets=await analyzeWorkbook(await file.arrayBuffer(),kind);
    if(!sheets.length)return NextResponse.json({message:'Tidak menemukan tabel yang dapat dibaca dari workbook ini.'},{status:400});
    return NextResponse.json({
      sourceName:file.name,
      sheets,
      suggestedSheetIndex:0,
      message:'KelasKita membaca struktur file secara adaptif. Periksa hasil pemetaan sebelum mengimpor.'
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({message:'Excel belum dapat dibaca. Pastikan file tidak rusak, tidak memakai password, dan simpan sebagai .xlsx/.xlsm.'},{status:500});
  }
}
