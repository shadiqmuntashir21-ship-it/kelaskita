-- KelasKita — skema awal PostgreSQL / Neon
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL UNIQUE,
  pin_hash varchar(255) NOT NULL,
  teacher_name varchar(160) NOT NULL,
  school_name varchar(200) NOT NULL,
  class_name varchar(100) NOT NULL,
  academic_year varchar(20) NOT NULL DEFAULT '2026/2027',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  nis varchar(50), nisn varchar(50), name varchar(180) NOT NULL, gender varchar(20),
  birth_place varchar(120), birth_date date, phone varchar(50), address text,
  guardian_name varchar(180), guardian_phone varchar(50), status varchar(30) NOT NULL DEFAULT 'Aktif',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id, nis), UNIQUE(license_id, nisn)
);
CREATE TABLE IF NOT EXISTS attendance_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  attendance_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(license_id, attendance_date)
);
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attendance_day_id uuid NOT NULL REFERENCES attendance_days(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, status varchar(30) NOT NULL DEFAULT 'Hadir', note text,
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(attendance_day_id, student_id)
);
CREATE TABLE IF NOT EXISTS student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, category varchar(60) NOT NULL DEFAULT 'Umum',
  title varchar(180) NOT NULL, content text NOT NULL, status varchar(60) NOT NULL DEFAULT 'Informasi',
  occurred_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, title varchar(200) NOT NULL,
  category varchar(80) NOT NULL DEFAULT 'Lainnya', level varchar(80), organizer varchar(180), rank varchar(100),
  description text, achieved_at date NOT NULL DEFAULT CURRENT_DATE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE, title varchar(200) NOT NULL, action text NOT NULL,
  due_date date, status varchar(40) NOT NULL DEFAULT 'Belum Dimulai', result text,
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS parent_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, method varchar(40) NOT NULL DEFAULT 'WhatsApp',
  topic varchar(180) NOT NULL, result text, communicated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS class_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL, category varchar(80) NOT NULL DEFAULT 'Kegiatan', agenda_date date NOT NULL,
  agenda_time time, description text, is_done boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id bigserial PRIMARY KEY, license_id uuid REFERENCES licenses(id) ON DELETE SET NULL, action varchar(120) NOT NULL,
  entity_type varchar(80), entity_id varchar(100), metadata jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_students_license ON students(license_id);
CREATE INDEX IF NOT EXISTS idx_attendance_days_license_date ON attendance_days(license_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_notes_license_student ON student_notes(license_id, student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_license_student ON achievements(license_id, student_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_license_status ON follow_ups(license_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_agendas_license_date ON class_agendas(license_id, agenda_date);
-- KelasKita V2: akademik, nilai, jadwal, dan pengaturan akademik
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  teacher_name varchar(160),
  mastery_score numeric(6,2) NOT NULL DEFAULT 75,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id, name)
);

CREATE TABLE IF NOT EXISTS academic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL UNIQUE REFERENCES licenses(id) ON DELETE CASCADE,
  active_semester varchar(20) NOT NULL DEFAULT 'Ganjil',
  calculation_mode varchar(30) NOT NULL DEFAULT 'Otomatis',
  daily_weight numeric(6,2) NOT NULL DEFAULT 30,
  quiz_weight numeric(6,2) NOT NULL DEFAULT 30,
  semester_weight numeric(6,2) NOT NULL DEFAULT 40,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name varchar(180) NOT NULL,
  category varchar(60) NOT NULL,
  semester varchar(20) NOT NULL DEFAULT 'Ganjil',
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  max_score numeric(8,2) NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score numeric(8,2),
  remedial_score numeric(8,2),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS subject_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_name varchar(20) NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_license ON subjects(license_id, is_active, name);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON assessments(license_id, subject_id, semester, assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_scores_license_student ON student_scores(license_id, student_id);
CREATE INDEX IF NOT EXISTS idx_scores_assessment ON student_scores(assessment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_schedules_license_day ON subject_schedules(license_id, day_name, start_time);

-- KelasKita V3: administrasi kelas, arsip tahun ajaran, dan penjualan
CREATE TABLE IF NOT EXISTS report_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year varchar(20) NOT NULL,
  semester varchar(20) NOT NULL,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id,student_id,academic_year,semester)
);

CREATE TABLE IF NOT EXISTS class_admin_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  item_key varchar(80) NOT NULL,
  label varchar(180) NOT NULL,
  category varchar(80) NOT NULL DEFAULT 'Administrasi',
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id,item_key)
);

CREATE TABLE IF NOT EXISTS class_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role_name varchar(120) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id,role_name)
);

CREATE TABLE IF NOT EXISTS duty_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day_name varchar(20) NOT NULL,
  task_name varchar(120) NOT NULL DEFAULT 'Piket Kelas',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id,student_id,day_name)
);

CREATE TABLE IF NOT EXISTS class_year_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  academic_year varchar(20) NOT NULL,
  class_name varchar(100) NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL,
  UNIQUE(license_id,academic_year,class_name)
);

CREATE TABLE IF NOT EXISTS commerce_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id=1),
  price integer NOT NULL DEFAULT 99000,
  admin_whatsapp varchar(40),
  purchase_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO commerce_config(id,price,purchase_note)
VALUES(1,99000,'Kode lisensi dan PIN KelasKita dikirim melalui email setelah pembayaran berhasil dikonfirmasi.')
ON CONFLICT(id) DO UPDATE SET price=EXCLUDED.price;

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(30) NOT NULL,
  label varchar(80) NOT NULL UNIQUE,
  account_number varchar(120),
  account_name varchar(160),
  instructions text,
  qr_image_url text,
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code varchar(40) NOT NULL UNIQUE,
  buyer_name varchar(180) NOT NULL,
  whatsapp varchar(40) NOT NULL,
  email varchar(200) NOT NULL,
  teacher_name varchar(180) NOT NULL,
  school_name varchar(200) NOT NULL,
  class_name varchar(120) NOT NULL,
  academic_year varchar(20) NOT NULL DEFAULT '2026/2027',
  amount integer NOT NULL DEFAULT 99000,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  payment_method_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  access_token_hash varchar(128) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'pending_payment',
  license_id uuid REFERENCES licenses(id) ON DELETE SET NULL,
  payment_claimed_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  final_email_sent_at timestamptz,
  final_email_error text,
  issued_pin_enc text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_notes_license_student ON report_notes(license_id,student_id);
CREATE INDEX IF NOT EXISTS idx_admin_items_license ON class_admin_items(license_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_officers_license ON class_officers(license_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_duty_license_day ON duty_roster(license_id,day_name);
CREATE INDEX IF NOT EXISTS idx_purchase_status ON purchase_orders(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_email ON purchase_orders(email,created_at DESC);

INSERT INTO payment_methods(type,label,account_number,account_name,instructions,qr_image_url,sort_order,active)
VALUES('qris','QRIS','ID1026601784022','TEMAN DIGITAL','Scan QRIS menggunakan aplikasi bank atau e-wallet yang mendukung QRIS. Pastikan merchant terbaca sebagai TEMAN DIGITAL sebelum menyelesaikan pembayaran.','https://dailyn-beta.vercel.app/qris-teman-digital.svg',0,true)
ON CONFLICT(label) DO UPDATE SET type=EXCLUDED.type,account_number=EXCLUDED.account_number,account_name=EXCLUDED.account_name,instructions=EXCLUDED.instructions,qr_image_url=EXCLUDED.qr_image_url,sort_order=EXCLUDED.sort_order,active=true,updated_at=now();

INSERT INTO payment_methods(type,label,account_number,account_name,sort_order,active) VALUES
('bank','BRI','518301014886532','Muhammad Shadiq Muntashir',1,true),
('bank','Mandiri','1510018726163','Muhammad Shadiq',2,true),
('bank','BSI','7273584344','Muhammad Shadiq Muntashir',3,true),
('bank','BANK Sulteng','0010201272944','Muhammad Shadiq Muntashir',4,true),
('ewallet','Gopay','082258687238','Muhammad Shadiq Muntashir',5,true)
ON CONFLICT(label) DO UPDATE SET type=EXCLUDED.type,account_number=EXCLUDED.account_number,account_name=EXCLUDED.account_name,sort_order=EXCLUDED.sort_order,active=true,updated_at=now();
