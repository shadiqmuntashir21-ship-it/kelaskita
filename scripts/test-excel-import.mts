import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {analyzeWorkbook} from '../lib/excel-smart.ts';

async function bytes(wb){
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// 1. Template resmi KelasKita
{
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Siswa');
  ws.addRow(['NIS','NISN','Nama','Jenis Kelamin','Tempat Lahir','Tanggal Lahir','Alamat','Nama Wali Siswa','No. Wali Siswa','No. Siswa']);
  ws.addRow(['26001','0100261001','Ahmad Fauzan','Laki-laki','Palu','2010-01-12','Jl. A','Nur Aini','081311111111','082211111111']);
  const [s]=await analyzeWorkbook(await bytes(wb),'siswa');
  assert.equal(s.suggestions.name,'Nama');
  assert.equal(s.suggestions.gender,'Jenis Kelamin');
  assert.equal(s.suggestions.nisn,'NISN');
  assert.equal(s.rows.length,1);
}

// 2. Excel siswa tidak sesuai template: judul, urutan berbeda, kolom tambahan
{
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Peserta Didik');
  ws.addRow(['DATA PESERTA DIDIK SMK NUSANTARA']);
  ws.addRow(['Tahun Ajaran 2026/2027']);
  ws.addRow([]);
  ws.addRow(['No','Nama Peserta Didik','L/P','Rombel','NISN','Hobi','Alamat Rumah','HP Orang Tua']);
  ws.addRow([1,'Siti Rahma','P','XI DKV 2','0100261002','Membaca','Jl. Setia Budi','081355500001']);
  ws.addRow([2,'Fadli Akbar','L','XI DKV 2','0100261003','Futsal','Jl. Pue Bongo','081355500002']);
  const [s]=await analyzeWorkbook(await bytes(wb),'siswa');
  assert.equal(s.headerRow,4);
  assert.equal(s.suggestions.name,'Nama Peserta Didik');
  assert.equal(s.suggestions.gender,'L/P');
  assert.equal(s.suggestions.class_name,'Rombel');
  assert.equal(s.suggestions.nisn,'NISN');
  assert.equal(s.suggestions.guardian_phone,'HP Orang Tua');
  assert.equal(s.classHint,'XI DKV 2');
  assert.equal(s.rows.length,2);
}

// 3. Rekap nilai lama: judul dan istilah berbeda
{
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Rekap Nilai Matematika');
  ws.addRow(['REKAP NILAI SEMESTER GANJIL']);
  ws.addRow(['Mata Pelajaran : Matematika']);
  ws.addRow(['Kelas : XI DKV 2']);
  ws.addRow([]);
  ws.addRow(['No','Nama Siswa','TH 1','Tugas Harian 2','UH 1','UTS','UAS']);
  ws.addRow([1,'Siti Rahma',88,90,86,84,91]);
  ws.addRow([2,'Fadli Akbar',76,80,78,75,82]);
  const [s]=await analyzeWorkbook(await bytes(wb),'nilai');
  assert.equal(s.headerRow,5);
  assert.equal(s.suggestions.name,'Nama Siswa');
  assert.ok(/matematika/i.test(s.subjectHint),s.subjectHint);
  assert.equal(s.scoreColumns.length,5);
  assert.equal(s.scoreColumns.find(x=>x.column==='UH 1')?.category,'Ulangan Harian');
  assert.equal(s.scoreColumns.find(x=>x.column==='UTS')?.category,'Tengah Semester');
  assert.equal(s.scoreColumns.find(x=>x.column==='UAS')?.category,'Akhir Semester');
}

// 4. Header nilai bertingkat: Ulangan Harian -> 1,2
{
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Bahasa Indonesia');
  ws.addRow(['Mata Pelajaran: Bahasa Indonesia']);
  ws.addRow(['Kelas: XI DKV 1']);
  ws.addRow([]);
  ws.addRow(['No','Nama Peserta Didik','Ulangan Harian','','PTS','PAS']);
  ws.addRow(['','',1,2,'','']);
  ws.addRow([1,'Ahmad Fauzan',80,85,82,88]);
  ws.addRow([2,'Nabila Putri',90,91,89,93]);
  const [s]=await analyzeWorkbook(await bytes(wb),'nilai');
  assert.equal(s.suggestions.name,'Nama Peserta Didik');
  const cols=s.scoreColumns.map(x=>x.column);
  assert.ok(cols.some(x=>/ulangan harian 1/i.test(x)),JSON.stringify(cols));
  assert.ok(cols.some(x=>/ulangan harian 2/i.test(x)),JSON.stringify(cols));
  assert.ok(cols.some(x=>/^PTS$/i.test(x)),JSON.stringify(cols));
  assert.ok(cols.some(x=>/^PAS$/i.test(x)),JSON.stringify(cols));
}


// 5. Upload browser: ArrayBuffer dari File.arrayBuffer() harus tetap terbaca
{
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Siswa');
  ws.addRow(['Nama Siswa','JK','Kelas']);
  ws.addRow(['Alya Maulida','P','XI DKV 1']);
  const buf=await bytes(wb);
  const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
  const [s]=await analyzeWorkbook(ab,'siswa');
  assert.equal(s.suggestions.name,'Nama Siswa');
  assert.equal(s.suggestions.gender,'JK');
  assert.equal(s.classHint,'XI DKV 1');
}



// 6. Workbook multi-kelas seperti FORMATIF 2: sheet 2A-2D dan nilai per bulan
{
  const wb=new ExcelJS.Workbook();
  const defs=[
    ['2A',2,[['ABIZAR ALFATIH',63,'',96],['ANNISA SALSABILA',88,'',91]]],
    ['2B',3,[['ATIA SYAKIRA NUR SHOLEHA',75,80,84],['BIMA ADITYA',82,78,90]]],
    ['2C',3,[['ADEEVA MEISYA',90,'',88],['RAKA PRATAMA',70,'',79]]],
    ['2D',6,[['ATIA SYAKIRA NUR SHOLEHA',81,'',85],['NAYLA PUTRI',92,'',94]]],
  ];
  for(const [name,headerRow,data] of defs){
    const ws=wb.addWorksheet(String(name));
    ws.addRow(['NILAI HASIL UJIAN FORMATIF '+name+' 2026']);
    while(ws.rowCount<Number(headerRow)-1)ws.addRow([]);
    ws.addRow(['NAMA','JULI','AGUSTUS','SEPTEMBER']);
    for(const row of data)ws.addRow(row);
  }
  const sheets=await analyzeWorkbook(await bytes(wb),'nilai');
  const classSheets=sheets.filter(s=>['2A','2B','2C','2D'].includes(s.classHint));
  assert.equal(classSheets.length,4,JSON.stringify(sheets.map(s=>({name:s.name,classHint:s.classHint}))));
  for(const s of classSheets){
    assert.equal(s.suggestions.name,'NAMA');
    assert.ok(s.scoreColumns.some(x=>/Formatif Juli/i.test(x.name)),JSON.stringify(s.scoreColumns));
    assert.ok(s.scoreColumns.some(x=>/Formatif September/i.test(x.name)),JSON.stringify(s.scoreColumns));
  }
}
console.log('Smart Excel Reader: 6 skenario lulus termasuk workbook multi-kelas FORMATIF.');
