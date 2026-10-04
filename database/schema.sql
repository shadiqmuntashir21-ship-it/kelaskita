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
