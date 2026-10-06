import {NextResponse} from 'next/server';
import {getClassSession as getSession} from '@/lib/class-session';
import {db} from '@/lib/db';
import {resolveClassContext} from '@/lib/v5-context';
import ExcelJS from 'exceljs';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
export const runtime='nodejs';

type R=(string|number|null|undefined)[];
const s=(v:any)=>v==null?'':String(v);
const titles:any={siswa:'Daftar Siswa',kehadiran:'Rekap Kehadiran', 'kehadiran-mapel':'Rekap Kehadiran Pertemuan',nilai:'Laporan Nilai',prestasi:'Rekap Prestasi',catatan:'Catatan Wali Kelas',tindak:'Tindak Lanjut',agenda:'Agenda Kelas',rapor:'Catatan Rapor',administrasi:'Kelengkapan Administrasi',struktur:'Struktur Kelas & Piket'};

async function data(sql:any,id:string,classId:string,j:string,month:string,subject?:string|null){
 if(j==='siswa'){const x=await sql`SELECT st.nis,st.nisn,st.name,st.gender,st.guardian_name,st.guardian_phone,st.phone,st.address,st.status FROM class_enrollments ce JOIN students st ON st.id=ce.student_id WHERE ce.license_id=${id} AND ce.class_id=${classId} AND ce.status='Aktif' AND st.status<>'Dihapus' ORDER BY st.name`;return{h:['NIS','NISN','Nama Siswa','Jenis Kelamin','Wali Siswa','No. Wali','No. Siswa','Alamat','Status'],r:x.map((a:any)=>[a.nis,a.nisn,a.name,a.gender,a.guardian_name,a.guardian_phone,a.phone,a.address,a.status])}}
 if(j==='kehadiran'){const d=`${month}-01`,x=await sql`SELECT st.nis,st.name,COUNT(ad.id) FILTER(WHERE COALESCE(ar.status,'Hadir')='Hadir')::int hadir,COUNT(ad.id) FILTER(WHERE ar.status='Sakit')::int sakit,COUNT(ad.id) FILTER(WHERE ar.status='Izin')::int izin,COUNT(ad.id) FILTER(WHERE ar.status='Alfa')::int alfa,COUNT(ad.id) FILTER(WHERE ar.status='Terlambat')::int terlambat,COUNT(ad.id) FILTER(WHERE ar.status='Dispensasi')::int dispensasi FROM class_enrollments ce JOIN students st ON st.id=ce.student_id LEFT JOIN attendance_days ad ON ad.license_id=${id} AND ad.class_id=${classId} AND ad.attendance_date>=${d}::date AND ad.attendance_date<(${d}::date+interval '1 month') LEFT JOIN attendance_records ar ON ar.attendance_day_id=ad.id AND ar.student_id=st.id WHERE ce.license_id=${id} AND ce.class_id=${classId} AND ce.status='Aktif' AND st.status<>'Dihapus' GROUP BY st.id,st.nis,st.name ORDER BY st.name`;return{h:['NIS','Nama Siswa','Hadir','Sakit','Izin','Alfa','Terlambat','Dispensasi'],r:x.map((a:any)=>[a.nis,a.name,a.hadir,a.sakit,a.izin,a.alfa,a.terlambat,a.dispensasi])}}
 if(j==='kehadiran-mapel'){
  if(!subject)return{h:['Keterangan'],r:[['Pilih mata pelajaran terlebih dahulu.']]};
  const d=`${month}-01`;
  const x=await sql`SELECT st.nis,st.name,
    COUNT(sas.id)::int pertemuan_tercatat,
    COUNT(sas.id) FILTER(WHERE COALESCE(sar.status,'Hadir')='Hadir')::int hadir,
    COUNT(sas.id) FILTER(WHERE sar.status='Sakit')::int sakit,
    COUNT(sas.id) FILTER(WHERE sar.status='Izin')::int izin,
    COUNT(sas.id) FILTER(WHERE sar.status='Alfa')::int alfa,
    COUNT(sas.id) FILTER(WHERE sar.status='Terlambat')::int terlambat,
    COUNT(sas.id) FILTER(WHERE sar.status='Dispensasi')::int dispensasi
    FROM class_enrollments ce
    JOIN students st ON st.id=ce.student_id
    LEFT JOIN subject_attendance_sessions sas
      ON sas.license_id=${id} AND sas.class_id=${classId} AND sas.subject_id=${subject}
      AND sas.meeting_date>=${d}::date AND sas.meeting_date<(${d}::date+interval '1 month')
    LEFT JOIN subject_attendance_records sar ON sar.session_id=sas.id AND sar.student_id=st.id
    WHERE ce.license_id=${id} AND ce.class_id=${classId} AND ce.status='Aktif' AND st.status<>'Dihapus'
    GROUP BY st.id,st.nis,st.name ORDER BY st.name`;
  return{h:['NIS','Nama Siswa','Pertemuan Tercatat','Hadir','Sakit','Izin','Alfa','Terlambat','Dispensasi'],
    r:x.map((a:any)=>[a.nis,a.name,a.pertemuan_tercatat,a.hadir,a.sakit,a.izin,a.alfa,a.terlambat,a.dispensasi])}
 }
 if(j==='nilai'){const x=subject?await sql`SELECT st.nis,st.name student,su.name subject,a.name assessment,a.category,a.semester,a.max_score,ss.score,ss.remedial_score FROM assessments a JOIN subjects su ON su.id=a.subject_id JOIN class_enrollments ce ON ce.license_id=${id} AND ce.class_id=${classId} AND ce.status='Aktif' JOIN students st ON st.id=ce.student_id LEFT JOIN student_scores ss ON ss.assessment_id=a.id AND ss.student_id=st.id WHERE a.license_id=${id} AND a.class_id=${classId} AND st.status<>'Dihapus' AND a.subject_id=${subject} ORDER BY su.name,a.assessment_date,st.name`:await sql`SELECT st.nis,st.name student,su.name subject,a.name assessment,a.category,a.semester,a.max_score,ss.score,ss.remedial_score FROM assessments a JOIN subjects su ON su.id=a.subject_id JOIN class_enrollments ce ON ce.license_id=${id} AND ce.class_id=${classId} AND ce.status='Aktif' JOIN students st ON st.id=ce.student_id LEFT JOIN student_scores ss ON ss.assessment_id=a.id AND ss.student_id=st.id WHERE a.license_id=${id} AND a.class_id=${classId} AND st.status<>'Dihapus' ORDER BY su.name,a.assessment_date,st.name`;return{h:['NIS','Nama Siswa','Mata Pelajaran','Penilaian','Jenis','Semester','Nilai Maks.','Nilai','Remedial','Nilai Digunakan'],r:x.map((a:any)=>[a.nis,a.student,a.subject,a.assessment,a.category,a.semester,a.max_score,a.score,a.remedial_score,a.remedial_score??a.score])}}
 if(j==='prestasi'){const x=await sql`SELECT st.nis,st.name,a.title,a.category,a.level,a.organizer,a.rank,a.achieved_at FROM achievements a JOIN students st ON st.id=a.student_id WHERE a.license_id=${id} AND a.class_id=${classId} ORDER BY a.achieved_at DESC`;return{h:['NIS','Nama Siswa','Prestasi','Kategori','Tingkat','Penyelenggara','Peringkat','Tanggal'],r:x.map((a:any)=>[a.nis,a.name,a.title,a.category,a.level,a.organizer,a.rank,a.achieved_at])}}
 if(j==='catatan'){const x=await sql`SELECT st.nis,st.name,n.category,n.title,n.content,n.status,n.occurred_at FROM student_notes n JOIN students st ON st.id=n.student_id WHERE n.license_id=${id} AND n.class_id=${classId} ORDER BY n.occurred_at DESC`;return{h:['NIS','Nama Siswa','Kategori','Judul','Catatan','Status','Tanggal'],r:x.map((a:any)=>[a.nis,a.name,a.category,a.title,a.content,a.status,a.occurred_at])}}
 if(j==='tindak'){const x=await sql`SELECT st.nis,COALESCE(st.name,'Umum') name,f.title,f.action,f.due_date,f.status,f.result FROM follow_ups f LEFT JOIN students st ON st.id=f.student_id WHERE f.license_id=${id} AND f.class_id=${classId} ORDER BY f.due_date NULLS LAST`;return{h:['NIS','Nama Siswa','Tindak Lanjut','Tindakan','Target','Status','Hasil'],r:x.map((a:any)=>[a.nis,a.name,a.title,a.action,a.due_date,a.status,a.result])}}
 if(j==='rapor'){const x=await sql`SELECT st.nis,st.name,rn.semester,rn.content,rn.updated_at FROM report_notes rn JOIN students st ON st.id=rn.student_id WHERE rn.license_id=${id} AND rn.class_id=${classId} ORDER BY st.name,rn.semester`;return{h:['NIS','Nama Siswa','Semester','Catatan Rapor','Diperbarui'],r:x.map((a:any)=>[a.nis,a.name,a.semester,a.content,a.updated_at])}}
 if(j==='administrasi'){const x=await sql`SELECT category,label,is_completed,notes,updated_at FROM class_admin_items WHERE license_id=${id} AND class_id=${classId} ORDER BY category,sort_order,label`;return{h:['Kategori','Administrasi','Status','Catatan','Diperbarui'],r:x.map((a:any)=>[a.category,a.label,a.is_completed?'Lengkap':'Belum',a.notes,a.updated_at])}}
 if(j==='struktur'){const o=await sql`SELECT co.role_name,st.name student FROM class_officers co JOIN students st ON st.id=co.student_id WHERE co.license_id=${id} AND co.class_id=${classId} ORDER BY co.sort_order,co.role_name`;const p=await sql`SELECT dr.day_name,st.name student,dr.task_name FROM duty_roster dr JOIN students st ON st.id=dr.student_id WHERE dr.license_id=${id} AND dr.class_id=${classId} ORDER BY CASE dr.day_name WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 ELSE 7 END,st.name`;return{h:['Jenis','Peran/Hari','Nama Siswa','Keterangan'],r:[...o.map((a:any)=>['Struktur',a.role_name,a.student,'Pengurus kelas']),...p.map((a:any)=>['Piket',a.day_name,a.student,a.task_name||'Piket Kelas'])]}}
 const x=await sql`SELECT title,category,agenda_date,agenda_time,description,is_done FROM class_agendas WHERE license_id=${id} AND class_id=${classId} ORDER BY agenda_date,agenda_time`;return{h:['Agenda','Kategori','Tanggal','Waktu','Keterangan','Status'],r:x.map((a:any)=>[a.title,a.category,a.agenda_date,a.agenda_time,a.description,a.is_done?'Selesai':'Terjadwal'])}
}

async function xlsx(title:string,sub:string,h:string[],rows:R[]){const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Laporan',{views:[{state:'frozen',ySplit:4}]});wb.creator='KelasKita';ws.mergeCells(1,1,1,h.length);ws.getCell(1,1).value='KelasKita · '+title;ws.getCell(1,1).font={bold:true,size:16,color:{argb:'FF0F2D6B'}};ws.mergeCells(2,1,2,h.length);ws.getCell(2,1).value=sub;ws.addRow([]);const hr=ws.addRow(h);hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F2D6B'}};rows.forEach(r=>ws.addRow(r.map(s)));ws.autoFilter={from:{row:4,column:1},to:{row:4,column:h.length}};h.forEach((_,i)=>{let w=h[i].length+3;const col=ws.getColumn(i+1);col.eachCell({includeEmpty:true},cell=>w=Math.max(w,Math.min(42,s(cell.value).length+2)));col.width=Math.min(42,w)});return Buffer.from(await wb.xlsx.writeBuffer())}
async function pdf(title:string,sub:string,h:string[],rows:R[]){const d=await PDFDocument.create(),font=await d.embedFont(StandardFonts.Helvetica),bold=await d.embedFont(StandardFonts.HelveticaBold),size:[number,number]=[841.89,595.28],m=34,rh=18,max=Math.min(8,h.length),cw=(size[0]-m*2)/max;let p=d.addPage(size),y=557;const head=()=>{p.drawText('KelasKita · '+title,{x:m,y,font:bold,size:15,color:rgb(.06,.18,.42)});y-=18;p.drawText(sub,{x:m,y,font,size:8,color:rgb(.4,.44,.52)});y-=25;for(let i=0;i<max;i++){p.drawRectangle({x:m+i*cw,y:y-rh+4,width:cw,height:rh,color:rgb(.06,.18,.42)});p.drawText(h[i].slice(0,24),{x:m+i*cw+4,y:y-9,font:bold,size:7,color:rgb(1,1,1)})}y-=rh};head();for(const r of rows){if(y<45){p=d.addPage(size);y=557;head()}for(let i=0;i<max;i++)p.drawText(s(r[i]).replace(/\s+/g,' ').slice(0,36),{x:m+i*cw+4,y:y-9,font,size:6.8,color:rgb(.12,.16,.23)});y-=rh}return Buffer.from(await d.save())}

export async function GET(req:Request){
 const ses=await getSession();if(!ses)return NextResponse.json({message:'Sesi berakhir.'},{status:401});
 try{
  const u=new URL(req.url),j=u.searchParams.get('jenis')||'siswa',format=u.searchParams.get('format')==='pdf'?'pdf':'xlsx',month=u.searchParams.get('bulan')||new Date().toISOString().slice(0,7),subject=u.searchParams.get('subject_id'),classId=u.searchParams.get('class_id'),sql=db();
  const cls=await resolveClassContext(ses.licenseId,classId);if(!cls)return NextResponse.json({message:'Kelas tidak ditemukan.'},{status:404});
  const pr=await sql`SELECT school_name FROM licenses WHERE id=${ses.licenseId}`,profile=pr[0],d=await data(sql,ses.licenseId,String(cls.id),j,month,subject),title=titles[j]||'Laporan Kelas',sub=`${profile.school_name} · ${cls.name} · ${cls.academic_year}${(j==='kehadiran'||j==='kehadiran-mapel')?' · '+month:''}`,body=format==='pdf'?await pdf(title,sub,d.h,d.r):await xlsx(title,sub,d.h,d.r),ext=format==='pdf'?'pdf':'xlsx';
  return new NextResponse(new Uint8Array(body),{headers:{'Content-Type':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="KelasKita_${j}_${String(cls.name).replace(/[^A-Za-z0-9_-]+/g,'_')}_${month}.${ext}"`}});
 }catch(e){console.error(e);return NextResponse.json({message:'Laporan belum berhasil dibuat.'},{status:500})}
}
