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

export const demoData = {
  profile:{teacher_name:'Ibu Rina Maharani',school_name:'SMK Nusantara',class_name:'X DKV 1',academic_year:'2026/2027',code:'DEMO-KELASKITA'},
  students:demoStudents,
  attendance: [
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
  communications:[
    {id:'c1',student_id:'d5',student_name:'Rizky Maulana',method:'WhatsApp',topic:'Konfirmasi sakit',result:'Orang tua menginformasikan Rizky sedang demam.',communicated_at:'2026-10-04T07:10:00+08:00'}
  ],
  agendas:[
    {id:'g1',title:'Pengumpulan proyek desain',category:'Akademik',agenda_date:'2026-10-04',agenda_time:'10:30',description:'Pastikan seluruh kelompok mengumpulkan berkas.',is_done:false},
    {id:'g2',title:'Rapat singkat pengurus kelas',category:'Kelas',agenda_date:'2026-10-04',agenda_time:'13:00',description:'Evaluasi kebersihan dan piket.',is_done:false},
    {id:'g3',title:'Pertemuan orang tua Ahmad',category:'Orang Tua',agenda_date:'2026-10-05',agenda_time:'09:00',description:'Pembahasan kehadiran.',is_done:false}
  ]
};
