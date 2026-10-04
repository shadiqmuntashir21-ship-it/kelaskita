export const demoStudents = [
  {id:'d1',nis:'24001',nisn:'009881001',name:'Ahmad Fauzan',gender:'Laki-laki',guardian_name:'Nur Aini',guardian_phone:'081234560101',status:'Aktif'},
  {id:'d2',nis:'24002',nisn:'009881002',name:'Siti Rahma',gender:'Perempuan',guardian_name:'Rahmawati',guardian_phone:'081234560102',status:'Aktif'},
  {id:'d3',nis:'24003',nisn:'009881003',name:'Fadli Akbar',gender:'Laki-laki',guardian_name:'Hasan Akbar',guardian_phone:'081234560103',status:'Aktif'},
  {id:'d4',nis:'24004',nisn:'009881004',name:'Nabila Putri',gender:'Perempuan',guardian_name:'Nurdin Putra',guardian_phone:'081234560104',status:'Aktif'},
  {id:'d5',nis:'24005',nisn:'009881005',name:'Rizky Maulana',gender:'Laki-laki',guardian_name:'Mawar',guardian_phone:'081234560105',status:'Aktif'},
  {id:'d6',nis:'24006',nisn:'009881006',name:'Aulia Safitri',gender:'Perempuan',guardian_name:'Safrudin',guardian_phone:'081234560106',status:'Aktif'},
  {id:'d7',nis:'24007',nisn:'009881007',name:'Dimas Pratama',gender:'Laki-laki',guardian_name:'Sri Wahyuni',guardian_phone:'081234560107',status:'Aktif'},
  {id:'d8',nis:'24008',nisn:'009881008',name:'Nadya Anjani',gender:'Perempuan',guardian_name:'Anjani',guardian_phone:'081234560108',status:'Aktif'},
];

const subjects=[
  {id:'sub1',name:'Matematika',teacher_name:'Bapak Arif',mastery_score:75,is_active:true},
  {id:'sub2',name:'Bahasa Indonesia',teacher_name:'Ibu Nita',mastery_score:75,is_active:true},
  {id:'sub3',name:'Produktif DKV',teacher_name:'Bapak Reza',mastery_score:78,is_active:true},
  {id:'sub4',name:'Bahasa Inggris',teacher_name:'Ibu Salma',mastery_score:75,is_active:true},
];
const schedules=[
  {id:'sch1',subject_id:'sub1',subject_name:'Matematika',teacher_name:'Bapak Arif',day_name:'Senin',start_time:'07:30',end_time:'09:00',room:'X DKV 1'},
  {id:'sch2',subject_id:'sub3',subject_name:'Produktif DKV',teacher_name:'Bapak Reza',day_name:'Senin',start_time:'09:15',end_time:'11:30',room:'Lab DKV'},
  {id:'sch3',subject_id:'sub2',subject_name:'Bahasa Indonesia',teacher_name:'Ibu Nita',day_name:'Selasa',start_time:'07:30',end_time:'09:00',room:'X DKV 1'},
  {id:'sch4',subject_id:'sub4',subject_name:'Bahasa Inggris',teacher_name:'Ibu Salma',day_name:'Rabu',start_time:'09:15',end_time:'10:45',room:'X DKV 1'},
];
const assessments=[
  {id:'as1',subject_id:'sub1',subject_name:'Matematika',name:'Tugas Persamaan Linear',category:'Tugas Harian',semester:'Ganjil',assessment_date:'2026-09-18',max_score:100},
  {id:'as2',subject_id:'sub1',subject_name:'Matematika',name:'UH 1',category:'Ulangan Harian',semester:'Ganjil',assessment_date:'2026-09-25',max_score:100},
  {id:'as3',subject_id:'sub1',subject_name:'Matematika',name:'PTS',category:'Tengah Semester',semester:'Ganjil',assessment_date:'2026-10-01',max_score:100},
  {id:'as4',subject_id:'sub3',subject_name:'Produktif DKV',name:'Proyek Poster',category:'Tugas Harian',semester:'Ganjil',assessment_date:'2026-09-28',max_score:100},
  {id:'as5',subject_id:'sub4',subject_name:'Bahasa Inggris',name:'UH 1',category:'Ulangan Harian',semester:'Ganjil',assessment_date:'2026-10-02',max_score:100},
];
const scoreValues:any={
  as1:[82,91,70,88,76,90,79,93],as2:[78,90,68,86,74,88,77,91],as3:[80,89,70,84,73,87,76,90],as4:[88,94,82,95,84,92,86,96],as5:[69,88,71,85,74,90,78,92]
};
const scores:any[]=[];
Object.entries(scoreValues).forEach(([assessment_id,vals]:any)=>vals.forEach((score:number,i:number)=>scores.push({id:`sc-${assessment_id}-${i}`,assessment_id,student_id:demoStudents[i].id,score,remedial_score:score<75?Math.min(82,score+12):null,note:''})));

export const demoData = {
  profile:{teacher_name:'Ibu Rina Maharani',school_name:'SMK Nusantara',class_name:'X DKV 1',academic_year:'2026/2027',code:'DEMO-KELASKITA'},
  students:demoStudents,
  attendance:[
    {student_id:'d1',status:'Alfa',note:''},{student_id:'d2',status:'Hadir',note:''},{student_id:'d3',status:'Terlambat',note:''},{student_id:'d4',status:'Hadir',note:''},
    {student_id:'d5',status:'Sakit',note:'Demam'},{student_id:'d6',status:'Hadir',note:''},{student_id:'d7',status:'Hadir',note:''},{student_id:'d8',status:'Hadir',note:''}
  ],
  notes:[
    {id:'n1',student_id:'d1',student_name:'Ahmad Fauzan',category:'Kehadiran',title:'Kehadiran perlu perhatian',content:'Sudah tiga kali tidak hadir tanpa keterangan bulan ini.',status:'Perlu Tindak Lanjut',occurred_at:'2026-10-04T08:15:00+08:00'},
    {id:'n2',student_id:'d2',student_name:'Siti Rahma',category:'Prestasi',title:'Aktif membantu teman',content:'Menjadi koordinator kelompok dan membantu presentasi kelas.',status:'Informasi',occurred_at:'2026-10-03T10:00:00+08:00'}
  ],
  achievements:[
    {id:'a1',student_id:'d4',student_name:'Nabila Putri',title:'Juara 2 Lomba Poster Digital',category:'Seni',level:'Kota',achieved_at:'2026-09-28'},
    {id:'a2',student_id:'d8',student_name:'Nadya Anjani',title:'Finalis Presentasi Kreatif',category:'Akademik',level:'Sekolah',achieved_at:'2026-09-24'}
  ],
  followUps:[
    {id:'f1',student_id:'d1',student_name:'Ahmad Fauzan',title:'Konfirmasi ketidakhadiran',action:'Hubungi orang tua dan catat hasil komunikasi.',due_date:'2026-10-04',status:'Belum Dimulai'},
    {id:'f2',student_id:'d3',student_name:'Fadli Akbar',title:'Pembinaan ketepatan waktu',action:'Diskusi singkat setelah jam pelajaran.',due_date:'2026-10-05',status:'Sedang Dilakukan'}
  ],
  communications:[{id:'c1',student_id:'d5',student_name:'Rizky Maulana',method:'WhatsApp',topic:'Konfirmasi sakit',result:'Orang tua menginformasikan Rizky sedang demam.',communicated_at:'2026-10-04T07:10:00+08:00'}],
  agendas:[
    {id:'g1',title:'Pengumpulan proyek desain',category:'Akademik',agenda_date:'2026-10-04',agenda_time:'10:30',description:'Pastikan seluruh kelompok mengumpulkan berkas.',is_done:false},
    {id:'g2',title:'Rapat singkat pengurus kelas',category:'Kelas',agenda_date:'2026-10-04',agenda_time:'13:00',description:'Evaluasi kebersihan dan piket.',is_done:false},
    {id:'g3',title:'Pertemuan orang tua Ahmad',category:'Orang Tua',agenda_date:'2026-10-05',agenda_time:'09:00',description:'Pembahasan kehadiran.',is_done:false}
  ],
  subjects,schedules,assessments,scores,
  academicSettings:{active_semester:'Ganjil',calculation_mode:'Otomatis',daily_weight:30,quiz_weight:30,semester_weight:40}
};
