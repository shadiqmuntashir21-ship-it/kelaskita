import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import ExcelJS from 'exceljs';
export const runtime = 'nodejs';

function readCell(cell:any){
  const v=cell?.value;
  if(v instanceof Date) return v.toISOString().slice(0,10);
  if(v && typeof v==='object' && 'result' in v) return (v as any).result ?? cell.text;
  if(typeof v==='number') return v;
  return String(cell?.text ?? v ?? '').trim();
}
function readSheet(ws:any){
  const maxRow=Math.min(ws.rowCount||0,1000);
  const maxCol=Math.min(ws.columnCount||0,80);
  let headerRow=1,best=-1;
  const known=['nis','nisn','nama','nama siswa','nama peserta didik','name','siswa'];
  for(let r=1;r<=Math.min(12,maxRow);r++){
    const values:string[]=[];
    for(let c=1;c<=maxCol;c++){
      const t=String(ws.getRow(r).getCell(c).text||'').trim().toLowerCase();
      if(t) values.push(t);
    }
    const hits=values.filter(x=>known.includes(x)).length;
    const score=hits*100+values.length;
    if(score>best){best=score;headerRow=r}
  }
  const headers:string[]=[];
  const used=new Map<string,number>();
  for(let c=1;c<=maxCol;c++){
    const raw=String(ws.getRow(headerRow).getCell(c).text||'').trim() || `Kolom ${c}`;
    const n=(used.get(raw)||0)+1;used.set(raw,n);
    headers.push(n===1?raw:`${raw} (${n})`);
  }
  const rows:any[]=[];
  for(let r=headerRow+1;r<=maxRow;r++){
    const obj:any={};let nonEmpty=0;
    headers.forEach((h,i)=>{const x=readCell(ws.getRow(r).getCell(i+1));obj[h]=x;if(String(x??'').trim())nonEmpty++});
    if(nonEmpty) rows.push(obj);
  }
  return {name:ws.name,headerRow,headers,rows};
}
export async function POST(req:Request){
  if(!await getSession()) return NextResponse.json({message:'Sesi berakhir.'},{status:401});
  try{
    const form=await req.formData();
    const file=form.get('file');
    if(!(file instanceof File)) return NextResponse.json({message:'File Excel belum dipilih.'},{status:400});
    if(!file.name.toLowerCase().endsWith('.xlsx')) return NextResponse.json({message:'Gunakan file Excel .xlsx.'},{status:400});
    const wb=new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const sheets=wb.worksheets.filter(w=>w.rowCount>0).map(readSheet);
    if(!sheets.length) return NextResponse.json({message:'Tidak menemukan tabel yang dapat dibaca.'},{status:400});
    return NextResponse.json({sourceName:file.name,sheets});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:'File Excel belum dapat dibaca. Pastikan file tidak rusak atau terkunci.'},{status:500});
  }
}
