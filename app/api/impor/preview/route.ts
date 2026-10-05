import { NextResponse } from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {analyzeWorkbook, type ImportKind} from '@/lib/excel-smart';
export const runtime='nodejs';

function extOk(name:string){const n=name.toLowerCase();return n.endsWith('.xlsx')||n.endsWith('.xlsm')}
function decodeDataUrl(v:string){
  const m=String(v||'').match(/^data:.*?;base64,(.+)$/);
  if(!m)return null;
  return Buffer.from(m[1],'base64');
}
export async function POST(req:Request){
  if(!await getSession())return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    const type=req.headers.get('content-type')||'';
    let kind:'siswa'|'nilai'='siswa',fileName='',buffer:Buffer|null=null;

    if(type.includes('application/json')){
      const body=await req.json();
      kind=String(body.kind||'siswa')==='nilai'?'nilai':'siswa';
      fileName=String(body.fileName||'');
      if(!extOk(fileName))return NextResponse.json({message:'Gunakan file Excel .xlsx atau .xlsm.'},{status:400});
      if(typeof body.dataUrl!=='string')return NextResponse.json({message:'Isi file Excel tidak diterima.'},{status:400});
      buffer=decodeDataUrl(body.dataUrl);
      if(!buffer?.length)return NextResponse.json({message:'Isi file Excel kosong atau tidak valid.'},{status:400});
    }else{
      const form=await req.formData();
      const file=form.get('file');
      kind=(String(form.get('kind')||'siswa')==='nilai'?'nilai':'siswa') as ImportKind;
      if(!(file instanceof File))return NextResponse.json({message:'File Excel belum dipilih.'},{status:400});
      fileName=file.name;
      if(!extOk(fileName))return NextResponse.json({message:'Gunakan file Excel .xlsx atau .xlsm.'},{status:400});
      buffer=Buffer.from(await file.arrayBuffer());
    }

    if(buffer.length>8*1024*1024)return NextResponse.json({message:'File terlalu besar. Maksimal 8 MB agar dapat diproses dengan aman.'},{status:413});
    const sheets=await analyzeWorkbook(buffer,kind);
    if(!sheets.length)return NextResponse.json({message:'Tidak menemukan tabel yang dapat dibaca dari workbook ini.'},{status:400});
    const classSheets=sheets.filter((x:any)=>x.classHint&&x.suggestions?.name);
    const totalRows=classSheets.reduce((n:number,x:any)=>n+(x.rows?.length||0),0);
    const totalValues=classSheets.reduce((n:number,x:any)=>n+(x.rows||[]).reduce((a:number,row:any)=>a+(x.scoreColumns||[]).filter((col:any)=>row[col.column]!==''&&row[col.column]!==null&&row[col.column]!==undefined).length,0),0);
    return NextResponse.json({
      sourceName:fileName,
      sheets,
      suggestedSheetIndex:0,
      workbook:{
        multiClassSuggested:kind==='nilai'&&classSheets.length>=2,
        classSheets:classSheets.map((x:any)=>({name:x.name,classHint:x.classHint,rows:x.rows?.length||0,scoreColumns:x.scoreColumns?.length||0,isFormative:!!x.isFormative})),
        totalRows,totalValues
      },
      message:'KelasKita membaca struktur file secara adaptif. Periksa hasil pemetaan sebelum mengimpor.'
    });
  }catch(e:any){
    console.error('excel-preview-failed',e);
    return NextResponse.json({message:'Excel belum dapat dibaca. Simpan ulang file sebagai .xlsx tanpa password lalu coba lagi.',code:'EXCEL_PREVIEW_FAILED'},{status:500});
  }
}
