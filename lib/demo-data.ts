const names=[
['Ahmad Fauzan','Laki-laki','Nur Aini'],['Siti Rahma','Perempuan','Rahmawati'],['Fadli Akbar','Laki-laki','Hasan Akbar'],['Nabila Putri','Perempuan','Nurdin Putra'],['Rizky Maulana','Laki-laki','Mawarni'],['Aulia Safitri','Perempuan','Safrudin'],['Dimas Pratama','Laki-laki','Sri Wahyuni'],['Nadya Anjani','Perempuan','Anjani'],
['Raka Pradana','Laki-laki','Junaidi'],['Zahra Azzahra','Perempuan','Nurhayati'],['Muhammad Farhan','Laki-laki','Ramlah'],['Citra Lestari','Perempuan','Sutrisno'],['Alif Ramadhan','Laki-laki','Rukmini'],['Aisyah Nurfadila','Perempuan','Abdullah'],['Reza Firmansyah','Laki-laki','Fitriani'],['Nayla Oktaviani','Perempuan','Rahman'],
['Ilham Hidayat','Laki-laki','Kartini'],['Putri Maharani','Perempuan','Mansur'],['Fikri Alamsyah','Laki-laki','Yuliana'],['Shafira Ramadhani','Perempuan','Ridwan'],['Ardiansyah Putra','Laki-laki','Mariani'],['Rania Khairunnisa','Perempuan','Hendra'],['Rifqi Saputra','Laki-laki','Sulastri'],['Keisya Amelia','Perempuan','Jamaluddin'],
['Aditya Nugraha','Laki-laki','Rosmini'],['Fatin Nurhaliza','Perempuan','Syahril'],['Bagas Wicaksono','Laki-laki','Nurlina'],['Alya Maulida','Perempuan','Nasruddin'],['Rafi Kurniawan','Laki-laki','Hasnah'],['Intan Permatasari','Perempuan','Arman']
] as const;

export const demoStudents=names.map((x,i)=>({
 id:`d${i+1}`,nis:`25${String(i+1).padStart(3,'0')}`,nisn:`010026${String(i+1).padStart(4,'0')}`,name:x[0],gender:x[1],
 birth_place:i%3===0?'Palu':i%3===1?'Donggala':'Sigi',birth_date:`2010-${String(i%12+1).padStart(2,'0')}-${String((i*3)%27+1).padStart(2,'0')}`,
 phone:`0822${String(58000000+i*137).padStart(8,'0')}`,address:`Jl. Pendidikan No. ${i+3}, Kota Palu, Sulawesi Tengah`,
 guardian_name:x[2],guardian_phone:`0813${String(46000000+i*173).padStart(8,'0')}`,status:'Aktif'
}));

const subjects=[
{id:'sub1',name:'Matematika',teacher_name:'Bapak Arif Rahman',mastery_score:75,is_active:true},
{id:'sub2',name:'Bahasa Indonesia',teacher_name:'Ibu Nita Permata',mastery_score:75,is_active:true},
{id:'sub3',name:'Bahasa Inggris',teacher_name:'Ibu Salma Yusuf',mastery_score:75,is_active:true},
{id:'sub4',name:'Pendidikan Pancasila',teacher_name:'Bapak Iqbal Hadi',mastery_score:75,is_active:true},
{id:'sub5',name:'Pendidikan Agama',teacher_name:'Ibu Nurul Hikmah',mastery_score:75,is_active:true},
{id:'sub6',name:'Informatika',teacher_name:'Bapak Denny Putra',mastery_score:78,is_active:true},
{id:'sub7',name:'Produktif DKV',teacher_name:'Bapak Reza Mahendra',mastery_score:78,is_active:true},
{id:'sub8',name:'PJOK',teacher_name:'Bapak Andi Saputra',mastery_score:75,is_active:true},
{id:'sub9',name:'Seni Budaya',teacher_name:'Ibu Maya Lestari',mastery_score:75,is_active:true}
];

const slots=[
['Senin','07:15','08:45','sub1','XI DKV 1'],['Senin','09:00','10:30','sub7','Lab DKV'],['Senin','10:45','12:15','sub2','XI DKV 1'],['Senin','13:00','14:30','sub6','Lab Komputer'],
['Selasa','07:15','08:45','sub5','XI DKV 1'],['Selasa','09:00','10:30','sub3','XI DKV 1'],['Selasa','10:45','12:15','sub7','Studio DKV'],['Selasa','13:00','14:30','sub4','XI DKV 1'],
['Rabu','07:15','08:45','sub2','XI DKV 1'],['Rabu','09:00','10:30','sub1','XI DKV 1'],['Rabu','10:45','12:15','sub8','Lapangan'],['Rabu','13:00','14:30','sub7','Studio DKV'],
['Kamis','07:15','08:45','sub3','XI DKV 1'],['Kamis','09:00','10:30','sub6','Lab Komputer'],['Kamis','10:45','12:15','sub9','Ruang Seni'],['Kamis','13:00','14:30','sub7','Lab DKV'],
['Jumat','07:15','08:30','sub5','XI DKV 1'],['Jumat','08:45','10:00','sub4','XI DKV 1'],['Jumat','10:15','11:30','sub2','XI DKV 1']
] as const;
const schedules=slots.map((x,i)=>{const s=subjects.find(y=>y.id===x[3])!;return{id:`sch${i+1}`,subject_id:s.id,subject_name:s.name,teacher_name:s.teacher_name,day_name:x[0],start_time:x[1],end_time:x[2],room:x[4]}});

const semDates:any={
 Ganjil:['2026-07-24','2026-08-07','2026-08-21','2026-09-04','2026-09-18','2026-09-25','2026-10-02','2026-10-09','2026-11-06','2026-12-04'],
 Genap:['2026-01-16','2026-01-30','2026-02-13','2026-02-27','2026-03-13','2026-03-27','2026-04-17','2026-05-08','2026-05-22','2026-06-05']
};
const assessmentTemplate=[
['Tugas 1','Tugas Harian'],['Tugas 2','Tugas Harian'],['Proyek/Praktik','Tugas Harian'],['Tugas 3','Tugas Harian'],
['UH 1','Ulangan Harian'],['UH 2','Ulangan Harian'],['PTS','Tengah Semester'],['Tugas 4','Tugas Harian'],['UH 3','Ulangan Harian'],['PAS','Akhir Semester']
] as const;
const assessments:any[]=[];
subjects.forEach((sb,si)=>['Genap','Ganjil'].forEach((sem:any)=>assessmentTemplate.forEach((a,ai)=>assessments.push({
 id:`as-${sb.id}-${sem[0]}-${ai+1}`,subject_id:sb.id,subject_name:sb.name,name:a[0],category:a[1],semester:sem,assessment_date:semDates[sem][ai],max_score:100
}))));

function clamp(v:number,min=58,max=98){return Math.max(min,Math.min(max,Math.round(v)))}
function scoreFor(studentIndex:number,subjectIndex:number,assessmentIndex:number,semester:string){
 const top=[1,3,7,16,23,27],attention=[0,2,8,13];
 let base=80+((studentIndex*7+subjectIndex*3)%8)-3;
 if(top.includes(studentIndex))base+=7;
 if(attention.includes(studentIndex))base-=studentIndex===0?8:6;
 if(subjectIndex===6&&[3,7,9,17,23].includes(studentIndex))base+=7;
 if(subjectIndex===0&&[0,2,8].includes(studentIndex))base-=4;
 const progression=semester==='Ganjil'?Math.floor(assessmentIndex/3):0;
 const wave=((studentIndex+subjectIndex+assessmentIndex*2)%7)-3;
 return clamp(base+progression+wave);
}
const scores:any[]=[];
assessments.forEach((a,ai)=>{
 const si=subjects.findIndex(s=>s.id===a.subject_id),localIndex=assessmentTemplate.findIndex(x=>x[0]===a.name);
 demoStudents.forEach((st,sti)=>{
   const score=scoreFor(sti,si,localIndex,a.semester);
   const mastery=subjects[si].mastery_score;
   scores.push({id:`sc-${a.id}-${st.id}`,assessment_id:a.id,student_id:st.id,score,remedial_score:score<mastery?clamp(score+9,mastery,88):null,note:score<mastery?'Perlu penguatan materi':''});
 });
});

const attendanceProfiles=demoStudents.map((s,i)=>{
 const total=212;
 let alfa=i===0?5:i===2?2:i===8?3:i===13?3:i%11===0?1:0;
 let terlambat=i===2?8:i===8?6:i===13?5:i%7===0?3:i%5===0?2:1;
 let sakit=2+(i%4),izin=1+(i%3),dispensasi=i%10===0?1:0;
 let hadir=total-alfa-terlambat-sakit-izin-dispensasi;
 return{student_id:s.id,total,hadir,sakit,izin,alfa,terlambat,dispensasi};
});

const currentStatus=['Hadir','Hadir','Terlambat','Hadir','Sakit','Hadir','Hadir','Hadir','Hadir','Izin','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir','Hadir'];
const attendance=demoStudents.map((s,i)=>({student_id:s.id,status:currentStatus[i],note:i===4?'Demam ringan':i===9?'Izin keluarga':''}));

const notes=[
['d1','Kehadiran','Kehadiran perlu perhatian','Terdapat lima alfa sepanjang dua semester. Sudah dilakukan pembinaan dan pemantauan berkala.','Perlu Tindak Lanjut','2026-10-02'],
['d3','Kedisiplinan','Ketepatan waktu','Beberapa kali datang terlambat pada jam pertama. Perlu menjaga kebiasaan berangkat lebih awal.','Perlu Perhatian','2026-09-29'],
['d8','Prestasi','Aktif membantu teman','Konsisten membantu anggota kelompok pada proyek desain dan presentasi kelas.','Informasi','2026-09-25'],
['d4','Akademik','Perkembangan sangat baik','Nilai tugas dan proyek stabil di atas rata-rata kelas.','Informasi','2026-09-22'],
['d9','Akademik','Perlu penguatan Matematika','Hasil evaluasi terakhir masih di bawah batas ketuntasan.','Perlu Tindak Lanjut','2026-09-19'],
['d14','Kehadiran','Perlu menjaga konsistensi','Terlambat beberapa kali pada bulan Agustus dan September.','Perlu Perhatian','2026-09-15'],
['d17','Prestasi','Presentasi terbaik','Menunjukkan kemampuan komunikasi visual dan presentasi yang sangat baik.','Informasi','2026-09-12'],
['d24','Sosial','Kolaborasi positif','Aktif menjadi penengah dan membantu pembagian kerja kelompok.','Informasi','2026-09-09'],
['d6','Akademik','Progres Bahasa Inggris','Nilai meningkat konsisten setelah latihan tambahan.','Informasi','2026-09-06'],
['d12','Sikap','Tanggung jawab tugas','Pengumpulan tugas semakin tepat waktu dan rapi.','Informasi','2026-09-03'],
['d20','Akademik','Perlu latihan presentasi','Masih kurang percaya diri saat presentasi di depan kelas.','Perlu Perhatian','2026-08-28'],
['d25','Prestasi','Aktif organisasi','Menjalankan tugas kepanitiaan kelas dengan baik.','Informasi','2026-08-24']
].map((x,i)=>({id:`n${i+1}`,student_id:x[0],student_name:demoStudents.find(s=>s.id===x[0])!.name,category:x[1],title:x[2],content:x[3],status:x[4],occurred_at:`${x[5]}T09:00:00+08:00`}));

const achievementSeed=[
['d4','Juara 2 Lomba Poster Digital','Seni','Kota','2026-09-28'],['d8','Finalis Presentasi Kreatif','Akademik','Sekolah','2026-09-24'],['d17','Juara 1 Desain Infografis','Seni','Provinsi','2026-08-21'],['d24','Siswa Inspiratif Bulanan','Sosial','Sekolah','2026-08-05'],['d2','Peringkat 1 Akademik Semester Genap','Akademik','Kelas','2026-06-18'],['d27','Juara 3 Fotografi Pelajar','Seni','Kota','2026-05-14'],['d7','Juara 2 Futsal Antar Kelas','Olahraga','Sekolah','2026-04-22'],['d18','Finalis Lomba Pidato','Akademik','Sekolah','2026-03-16'],['d11','Pengurus OSIS Teraktif','Organisasi','Sekolah','2026-02-20'],['d30','Juara Kebersihan Kelompok','Kelas','Sekolah','2026-01-29'],['d6','Peningkatan Akademik Terbaik','Akademik','Kelas','2025-12-12'],['d21','Juara 3 Poster Anti Bullying','Seni','Sekolah','2025-11-20']
];
const achievements=achievementSeed.map((x,i)=>({id:`ach${i+1}`,student_id:x[0],student_name:demoStudents.find(s=>s.id===x[0])!.name,title:x[1],category:x[2],level:x[3],achieved_at:x[4]}));

const followUps=[
{id:'f1',student_id:'d1',student_name:'Ahmad Fauzan',title:'Pemantauan kehadiran',action:'Pantau kehadiran selama empat minggu dan evaluasi bersama siswa.',due_date:'2026-10-09',status:'Sedang Dilakukan'},
{id:'f2',student_id:'d3',student_name:'Fadli Akbar',title:'Pembinaan ketepatan waktu',action:'Evaluasi kebiasaan datang pagi dan catat perkembangan minggu ini.',due_date:'2026-10-06',status:'Sedang Dilakukan'},
{id:'f3',student_id:'d9',student_name:'Raka Pradana',title:'Penguatan Matematika',action:'Ikuti latihan tambahan dan remedial materi fungsi.',due_date:'2026-10-03',status:'Belum Dimulai'},
{id:'f4',student_id:'d14',student_name:'Aisyah Nurfadila',title:'Monitoring keterlambatan',action:'Pantau jam kedatangan selama dua minggu.',due_date:'2026-10-10',status:'Menunggu'},
{id:'f5',student_id:'d20',student_name:'Shafira Ramadhani',title:'Latihan presentasi',action:'Berikan kesempatan presentasi singkat pada proyek berikutnya.',due_date:'2026-10-15',status:'Belum Dimulai'},
{id:'f6',student_id:'d6',student_name:'Aulia Safitri',title:'Evaluasi latihan Bahasa Inggris',action:'Tinjau hasil latihan tambahan.',due_date:'2026-09-20',status:'Selesai',result:'Nilai meningkat dan target tercapai.'},
{id:'f7',student_id:'d12',student_name:'Citra Lestari',title:'Konsistensi pengumpulan tugas',action:'Pantau ketepatan waktu selama satu bulan.',due_date:'2026-09-12',status:'Selesai',result:'Pengumpulan tugas sudah konsisten.'},
{id:'f8',student_id:'d21',student_name:'Ardiansyah Putra',title:'Pendampingan proyek',action:'Bantu pembagian target proyek desain.',due_date:'2026-08-28',status:'Selesai',result:'Proyek selesai tepat waktu.'}
];

const agendas=[
{id:'g1',title:'Evaluasi proyek identitas visual',category:'Akademik',agenda_date:'2026-10-05',agenda_time:'10:45',description:'Review progres proyek Produktif DKV.',is_done:false},
{id:'g2',title:'Rapat pengurus kelas',category:'Kelas',agenda_date:'2026-10-05',agenda_time:'13:10',description:'Evaluasi piket, kebersihan, dan agenda bulan Oktober.',is_done:false},
{id:'g3',title:'Remedial Matematika',category:'Akademik',agenda_date:'2026-10-06',agenda_time:'14:00',description:'Remedial siswa yang belum mencapai ketuntasan.',is_done:false},
{id:'g4',title:'Persiapan pameran karya',category:'Kegiatan',agenda_date:'2026-10-09',agenda_time:'09:00',description:'Pembagian karya dan penanggung jawab display.',is_done:false},
{id:'g5',title:'Pengumpulan tugas Bahasa Indonesia',category:'Akademik',agenda_date:'2026-10-12',agenda_time:'08:00',description:'Pengumpulan portofolio teks eksplanasi.',is_done:false},
{id:'g6',title:'Evaluasi tengah semester',category:'Kelas',agenda_date:'2026-09-30',agenda_time:'13:00',description:'Merekap hasil PTS dan tindak lanjut.',is_done:true},
{id:'g7',title:'Kerja bakti kelas',category:'Kelas',agenda_date:'2026-09-18',agenda_time:'07:00',description:'Penataan ruang dan papan karya.',is_done:true},
{id:'g8',title:'Pemilihan karya terbaik bulan September',category:'Kegiatan',agenda_date:'2026-09-25',agenda_time:'11:00',description:'Kurasi karya siswa.',is_done:true}
];

const monthlyHistory=[
['Nov 2025',94.2,81.8,4],['Des 2025',95.0,82.1,3],['Jan 2026',95.1,82.6,3],['Feb 2026',94.6,82.9,4],
['Mar 2026',93.7,83.4,5],['Apr 2026',95.4,83.6,3],['Mei 2026',95.9,84.0,3],['Jun 2026',96.2,84.2,2],
['Jul 2026',95.6,83.9,3],['Agu 2026',96.4,84.3,3],['Sep 2026',95.2,84.5,4],['Okt 2026',95.8,84.6,4]
].map((x,i)=>({id:`mh${i+1}`,month:x[0],attendance_rate:x[1],academic_average:x[2],attention_count:x[3]}));

const adminLabels=[
['profil-siswa','Data siswa lengkap','Data Kelas'],['struktur-kelas','Struktur organisasi kelas','Data Kelas'],['jadwal-pelajaran','Jadwal pelajaran','Jadwal'],
['jadwal-piket','Jadwal piket','Jadwal'],['kehadiran','Rekap kehadiran','Kehadiran'],['nilai','Rekap nilai siswa','Akademik'],
['prestasi','Rekap prestasi','Akademik'],['catatan','Catatan wali kelas','Pembinaan'],['tindak-lanjut','Tindak lanjut siswa','Pembinaan'],
['catatan-rapor','Catatan rapor','Pelaporan'],['laporan-bulanan','Laporan bulanan','Pelaporan'],['laporan-semester','Laporan semester','Pelaporan']
] as const;
const adminItems=adminLabels.map((x,i)=>({id:`adm${i+1}`,item_key:x[0],label:x[1],category:x[2],is_completed:i!==10,sort_order:(i+1)*10}));

const officers=[
{id:'o1',student_id:'d2',student_name:'Siti Rahma',role_name:'Ketua Kelas',sort_order:1},
{id:'o2',student_id:'d17',student_name:'Ilham Hidayat',role_name:'Wakil Ketua',sort_order:2},
{id:'o3',student_id:'d4',student_name:'Nabila Putri',role_name:'Sekretaris I',sort_order:3},
{id:'o4',student_id:'d18',student_name:'Putri Maharani',role_name:'Sekretaris II',sort_order:4},
{id:'o5',student_id:'d24',student_name:'Keisya Amelia',role_name:'Bendahara I',sort_order:5},
{id:'o6',student_id:'d11',student_name:'Muhammad Farhan',role_name:'Bendahara II',sort_order:6}
];
const days=['Senin','Selasa','Rabu','Kamis','Jumat'];
const duties=demoStudents.map((s,i)=>({id:`du${i+1}`,student_id:s.id,student_name:s.name,day_name:days[i%5],task_name:i%3===0?'Kebersihan & papan tulis':'Piket Kelas'}));

const reportNotes=demoStudents.map((s,i)=>({id:`rn${i+1}`,student_id:s.id,academic_year:'2026/2027',semester:'Ganjil',content:i===0?`${s.name} perlu meningkatkan konsistensi kehadiran serta ketuntasan beberapa mata pelajaran. Perkembangan tetap dipantau melalui tindak lanjut berkala.`:i===2?`${s.name} menunjukkan kemampuan akademik yang cukup baik, namun perlu meningkatkan kedisiplinan dan ketepatan waktu hadir di sekolah.`:`${s.name} menunjukkan perkembangan belajar yang baik dan cukup konsisten. Pertahankan kedisiplinan, keaktifan, dan tanggung jawab dalam kegiatan kelas.`}));

export const demoData={
 profile:{teacher_name:'Ibu Rina Maharani',school_name:'SMK Nusantara Palu',class_name:'XI DKV 1',academic_year:'2026/2027',code:'DEMO-KELASKITA'},
 students:demoStudents,attendance,notes,achievements,followUps,agendas,subjects,schedules,assessments,scores,
 academicSettings:{active_semester:'Ganjil',calculation_mode:'Otomatis',daily_weight:30,quiz_weight:30,semester_weight:40},
 attendanceSummary:attendanceProfiles,monthlyHistory,reportNotes,adminItems,officers,duties,
 archives:[{id:'arc1',academic_year:'2025/2026',class_name:'X DKV 1',closed_at:'2026-06-28T10:00:00+08:00',summary:{students:30,attendance_rate:95.1,academic_average:83.4}}]
};
