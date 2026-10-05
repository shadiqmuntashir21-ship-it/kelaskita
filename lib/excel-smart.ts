import ExcelJS from 'exceljs';

export type ImportKind='siswa'|'nilai';

const FIELD_PATTERNS:Record<string,RegExp[]>={
  nisn:[/^nisn$/, /nomor induk siswa nasional/],
  nis:[/^nis$/, /^(no|nomor) induk( siswa)?$/, /nomor siswa sekolah/],
  name:[/^nama$/, /^nama (lengkap )?(siswa|peserta didik|murid)$/, /^(siswa|peserta didik|murid)$/, /^name$/],
  gender:[/^jk$/, /^l\s*\/\s*p$/, /jenis kelamin/, /^kelamin$/, /^gender$/, /^sex$/],
  class_name:[/^kelas$/, /^rombel$/, /rombongan belajar/, /^class$/],
  birth_place:[/tempat lahir/, /^tmp lahir$/, /^tempat$/],
  birth_date:[/tanggal lahir/, /^tgl lahir$/, /^date of birth$/, /^dob$/],
  address:[/^alamat/, /address/],
  guardian_name:[/nama.*(wali|orang tua|ortu)/, /^(wali|orang tua|ortu)( siswa| murid)?$/],
  guardian_phone:[/(no|nomor|hp|wa|telp|telepon).*(wali|orang tua|ortu)/, /(wali|orang tua|ortu).*(no|nomor|hp|wa|telp|telepon)/],
  phone:[/^(no|nomor|hp|wa|telp|telepon).*(siswa|murid)?$/, /^(hp|wa) siswa$/],
};
const SCORE_HINT=/(nilai|tugas|\bth\b|harian|\buh\b|ulangan|pts|uts|pas|uas|praktik|praktek|proyek|projek|kuis|quiz|asesmen|assessment|sumatif|formatif|portofolio)/i;
const GENERIC_SHEET=/^(sheet\s*\d*|data|siswa|nilai|rekap|daftar)$/i;

export function normalizeText(v:any){
  return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_\-.]+/g,' ').replace(/[^a-z0-9/ ]+/g,' ').replace(/\s+/g,' ').trim();
}
export function readCell(cell:any){
  const v=cell?.value;
  if(v instanceof Date)return v.toISOString().slice(0,10);
  if(v&&typeof v==='object'){
    if('result' in v)return (v as any).result??cell.text;
    if('text' in v)return String((v as any).text??'').trim();
  }
  if(typeof v==='number')return v;
  return String(cell?.text??v??'').trim();
}
export function normalizeGender(v:any){
  const x=normalizeText(v);
  if(['l','lk','laki','laki laki','male','pria'].includes(x))return'Laki-laki';
  if(['p','pr','perempuan','female','wanita'].includes(x))return'Perempuan';
  return String(v??'').trim();
}
export function normalizePhone(v:any){
  let x=String(v??'').trim().replace(/\.0$/,'').replace(/[^0-9+]/g,'');
  if(!x)return'';
  if(x.startsWith('+62'))x='0'+x.slice(3);
  else if(x.startsWith('62'))x='0'+x.slice(2);
  else if(/^8\d{8,12}$/.test(x))x='0'+x;
  return x;
}
export function normalizeNisn(v:any){
  let x=String(v??'').trim().replace(/\.0$/,'').replace(/\D/g,'');
  if(x&&x.length<10&&x.length>=7)x=x.padStart(10,'0');
  return x;
}
export function normalizeDate(v:any){
  if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);
  if(typeof v==='number'&&v>20000&&v<80000){
    const d=new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000);
    return d.toISOString().slice(0,10);
  }
  const s=String(v??'').trim();
  if(!s)return'';
  if(/^\d{4}-\d{1,2}-\d{1,2}/.test(s)){
    const [y,m,d]=s.slice(0,10).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if(m){let y=Number(m[3]);if(y<100)y+=2000;return `${y}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`}
  const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
}
export function parseScore(v:any){
  if(v===null||v===undefined||v==='')return null;
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  const s=String(v).trim().replace(',','.');
  const direct=Number(s);if(Number.isFinite(direct))return direct;
  const m=s.match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null;
}
function matchesField(header:string,key:string){
  const x=normalizeText(header);
  if(!x)return false;
  if(key==='name'&&/(wali|orang tua|ortu|guru|mapel|pelajaran)/.test(x))return false;
  if(key==='phone'&&/(wali|orang tua|ortu)/.test(x))return false;
  if(key==='nis'&&/nisn/.test(x))return false;
  return (FIELD_PATTERNS[key]||[]).some(r=>r.test(x));
}
function semanticHits(values:string[],kind:ImportKind){
  let score=0;
  for(const raw of values){
    const x=normalizeText(raw);if(!x)continue;
    if(matchesField(x,'name'))score+=8;
    if(matchesField(x,'nisn')||matchesField(x,'nis'))score+=4;
    if(matchesField(x,'gender'))score+=4;
    if(matchesField(x,'class_name'))score+=3;
    if(kind==='nilai'&&SCORE_HINT.test(x))score+=5;
  }
  return score;
}
function detectHeaderRow(ws:any,kind:ImportKind){
  const maxRow=Math.min(ws.rowCount||0,30),maxCol=Math.min(ws.columnCount||0,100);
  let best={row:1,score:-Infinity};
  for(let r=1;r<=maxRow;r++){
    const vals:string[]=[];let nonEmpty=0;
    for(let c=1;c<=maxCol;c++){
      const x=String(ws.getRow(r).getCell(c).text||readCell(ws.getRow(r).getCell(c))||'').trim();
      if(x){nonEmpty++;vals.push(x)}
    }
    if(nonEmpty<2)continue;
    const semantics=semanticHits(vals,kind);
    const shortness=vals.filter(v=>String(v).length<=35).length;
    const below=Array.from({length:Math.min(4,Math.max(0,maxRow-r))},(_,i)=>r+i+1).reduce((n,rr)=>{
      let cnt=0;for(let c=1;c<=maxCol;c++)if(String(readCell(ws.getRow(rr).getCell(c))??'').trim())cnt++;return n+(cnt>=2?1:0)
    },0);
    const score=semantics*10+Math.min(nonEmpty,20)*1.2+shortness*.2+below*3-(nonEmpty===1?20:0);
    if(score>best.score)best={row:r,score};
  }
  return best.row;
}
function buildHeaders(ws:any,row:number){
  const maxCol=Math.min(ws.columnCount||0,100),headers:string[]=[],used=new Map<string,number>();
  let nameCol=0;
  for(let c=1;c<=maxCol;c++){
    const cur=String(ws.getRow(row).getCell(c).text||readCell(ws.getRow(row).getCell(c))||'').trim();
    if(matchesField(cur,'name')){nameCol=c;break}
  }
  const nextName=nameCol&&row<(ws.rowCount||0)?String(readCell(ws.getRow(row+1).getCell(nameCol))??'').trim():'';
  const useNextSubheader=!!nameCol&&!nextName;
  let currentScoreGroup='';
  for(let c=1;c<=maxCol;c++){
    const cur=String(ws.getRow(row).getCell(c).text||readCell(ws.getRow(row).getCell(c))||'').trim();
    const prev=row>1?String(ws.getRow(row-1).getCell(c).text||readCell(ws.getRow(row-1).getCell(c))||'').trim():'';
    const next=useNextSubheader&&row<(ws.rowCount||0)?String(ws.getRow(row+1).getCell(c).text||readCell(ws.getRow(row+1).getCell(c))||'').trim():'';
    if(cur&&SCORE_HINT.test(cur))currentScoreGroup=cur;
    else if(prev&&SCORE_HINT.test(prev))currentScoreGroup=prev;

    let raw=cur;
    if(useNextSubheader&&currentScoreGroup&&/^\d{1,2}$/.test(next))raw=`${currentScoreGroup} ${next}`;
    else if((!cur||/^\d{1,2}$/.test(cur))&&currentScoreGroup&&SCORE_HINT.test(currentScoreGroup))raw=cur?`${currentScoreGroup} ${cur}`:currentScoreGroup;
    if(!raw&&prev&&!/^(sekolah|kelas|mata pelajaran|mapel)\b/i.test(prev))raw=prev;
    raw=raw||`Kolom ${c}`;
    const n=(used.get(raw)||0)+1;used.set(raw,n);headers.push(n===1?raw:`${raw} (${n})`);
  }
  while(headers.length>1){
    const idx=headers.length-1;let any=false;
    for(let r=row+1;r<=Math.min(ws.rowCount,row+30);r++)if(String(readCell(ws.getRow(r).getCell(idx+1))??'').trim()){any=true;break}
    if(any||!/^Kolom \d+$/.test(headers[idx]))break;headers.pop();
  }
  return headers;
}
function readRows(ws:any,headerRow:number,headers:string[]){
  const rows:any[]=[];
  for(let r=headerRow+1;r<=Math.min(ws.rowCount||0,headerRow+2000);r++){
    const obj:any={};let non=0;
    headers.forEach((h,i)=>{const x=readCell(ws.getRow(r).getCell(i+1));obj[h]=x;if(String(x??'').trim())non++});
    if(non>=1)rows.push(obj);
  }
  return rows;
}
function valuesFor(rows:any[],h:string){return rows.slice(0,120).map(r=>r[h]).filter(v=>String(v??'').trim()!=='')}
function ratio(vals:any[],fn:(v:any)=>boolean){return vals.length?vals.filter(fn).length/vals.length:0}
function looksName(v:any){const x=String(v??'').trim();return /^[A-Za-zÀ-ž.'’\- ]{4,}$/.test(x)&&x.split(/\s+/).length>=1&&!/^laki|^perempuan$/i.test(x)}
function looksClass(v:any){const x=normalizeText(v).toUpperCase();return /^(X|XI|XII|10|11|12)(\s|[-.]|$)[A-Z0-9]/.test(x)||/^(X|XI|XII)\s*[A-Z]{2,}/.test(x)}
function looksPhone(v:any){const x=String(v??'').replace(/\D/g,'');return x.length>=9&&x.length<=15&&(x.startsWith('08')||x.startsWith('62')||x.startsWith('8'))}
function looksNisn(v:any){const x=String(v??'').replace(/\D/g,'');return x.length===10}
function looksDate(v:any){return !!normalizeDate(v)}
function mappingScore(header:string,vals:any[],key:string){
  let s=matchesField(header,key)?100:0;const h=normalizeText(header);
  if(key==='gender')s+=ratio(vals,v=>['Laki-laki','Perempuan'].includes(normalizeGender(v)))*55;
  if(key==='name')s+=ratio(vals,looksName)*35;
  if(key==='class_name')s+=ratio(vals,looksClass)*55;
  if(key==='guardian_phone'||key==='phone')s+=ratio(vals,looksPhone)*35;
  if(key==='nisn')s+=ratio(vals,looksNisn)*45;
  if(key==='birth_date')s+=ratio(vals,looksDate)*35;
  if(key==='address'&&/alamat|address/.test(h))s+=20;
  if(key==='guardian_name'&&/(wali|ortu|orang tua)/.test(h)&&!/(no|nomor|hp|wa|telp)/.test(h))s+=30;
  return s;
}
export function suggestMappings(headers:string[],rows:any[]){
  const keys=['nis','nisn','name','gender','class_name','birth_place','birth_date','address','guardian_name','guardian_phone','phone'];
  const out:Record<string,string>={};const used=new Set<string>();
  for(const key of keys){
    let best={h:'',s:0};
    for(const h of headers){if(used.has(h))continue;const s=mappingScore(h,valuesFor(rows,h),key);if(s>best.s)best={h,s}}
    const threshold=key==='name'?28:key==='gender'||key==='class_name'?35:60;
    if(best.s>=threshold){out[key]=best.h;used.add(best.h)}else out[key]='';
  }
  return out;
}
export function detectScoreColumns(headers:string[],rows:any[],mapping:Record<string,string>){
  const identity=new Set(Object.values(mapping).filter(Boolean));
  return headers.filter(h=>{
    if(identity.has(h))return false;
    const x=normalizeText(h);
    if(/^(no|nomor|urut|kelas|rombel|nis|nisn|hp|wa|telepon|telp)$/.test(x))return false;
    if(/(hp|telepon|telp|wa|nomor).*?(siswa|wali|ortu|orang tua)/.test(x))return false;
    const vals=valuesFor(rows,h),nums=vals.map(parseScore).filter((v):v is number=>v!==null);
    if(!nums.length)return false;
    const numericRatio=nums.length/Math.max(vals.length,1),scoreRange=nums.filter(n=>n>=0&&n<=100).length/nums.length;
    return (SCORE_HINT.test(x)&&numericRatio>=.2&&scoreRange>=.7)||(numericRatio>=.72&&scoreRange>=.9);
  }).map(h=>({column:h,name:h,category:categoryFor(h),maxScore:100,include:true}));
}
export function categoryFor(header:string){
  const x=normalizeText(header);
  if(/pts|uts|tengah semester|sumatif tengah|asesmen tengah/.test(x))return'Tengah Semester';
  if(/pas|uas|akhir semester|sumatif akhir|asesmen akhir/.test(x))return'Akhir Semester';
  if(/\buh\b|ulangan harian|kuis|quiz|sumatif harian/.test(x))return'Ulangan Harian';
  if(/proyek|projek|praktik|praktek|portofolio/.test(x))return'Lainnya';
  return'Tugas Harian';
}
function cleanHint(s:string){return s.replace(/\s+/g,' ').replace(/^[\s:;\-]+|[\s:;\-]+$/g,'').slice(0,80)}
function metadata(ws:any,headerRow:number){
  const parts:string[]=[];
  for(let r=1;r<headerRow;r++)for(let c=1;c<=Math.min(ws.columnCount||0,12);c++){const x=String(readCell(ws.getRow(r).getCell(c))??'').trim();if(x)parts.push(x)}
  const text=parts.join(' | ');
  const subjectMatch=text.match(/(?:mata pelajaran|mapel|pelajaran|subject)\s*[:\-]?\s*([^|]{2,60})/i);
  const classMatch=text.match(/(?:kelas|rombel)\s*[:\-]?\s*([^|]{1,40})/i);
  let subjectHint=subjectMatch?cleanHint(subjectMatch[1]):'';
  let classHint=classMatch?cleanHint(classMatch[1]):'';
  if(!subjectHint&&!GENERIC_SHEET.test(ws.name)&&!/(siswa|peserta|kelas)/i.test(ws.name))subjectHint=cleanHint(ws.name.replace(/rekap|nilai|semester|ganjil|genap/gi,''));
  return{subjectHint,classHint,metadataText:text.slice(0,500)};
}
export function analyzeWorksheet(ws:any,kind:ImportKind){
  const headerRow=detectHeaderRow(ws,kind),headers=buildHeaders(ws,headerRow),rows=readRows(ws,headerRow,headers);
  const suggestions=suggestMappings(headers,rows),meta=metadata(ws,headerRow),scoreColumns=detectScoreColumns(headers,rows,suggestions);
  const classValues=suggestions.class_name?valuesFor(rows,suggestions.class_name).filter(looksClass).map(v=>String(v).trim()):[];
  const classFreq=new Map<string,number>();classValues.forEach(x=>classFreq.set(x,(classFreq.get(x)||0)+1));
  const detectedClass=[...classFreq.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||meta.classHint||'';
  const nameRows=suggestions.name?valuesFor(rows,suggestions.name).filter(looksName).length:0;
  const qualityScore=nameRows*4+Object.values(suggestions).filter(Boolean).length*8+scoreColumns.length*(kind==='nilai'?8:1);
  return{name:ws.name,headerRow,headers,rows,suggestions,scoreColumns,subjectHint:meta.subjectHint,classHint:detectedClass,qualityScore};
}
export async function analyzeWorkbook(buffer:ArrayBuffer|Buffer,kind:ImportKind){
  const wb=new ExcelJS.Workbook();
  const input=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer);
  await wb.xlsx.load(input);
  const sheets=wb.worksheets.filter(w=>w.rowCount>0).map(w=>analyzeWorksheet(w,kind)).filter(s=>s.rows.length||s.headers.length);
  sheets.sort((a,b)=>b.qualityScore-a.qualityScore);
  return sheets;
}
