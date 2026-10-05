-- KelasKita V5 — Multi-role / Multi-class migration snapshot
-- Non-destructive baseline. Runtime implementation remains idempotent in lib/v5-schema.ts.

ALTER TABLE licenses ADD COLUMN IF NOT EXISTS usage_mode varchar(20);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS v5_onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS v5_migrated_at timestamptz;

CREATE TABLE IF NOT EXISTS classes(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  academic_year varchar(20) NOT NULL DEFAULT '2026/2027',
  level varchar(40),
  is_homeroom boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id,academic_year,name)
);
CREATE INDEX IF NOT EXISTS idx_classes_license ON classes(license_id,is_active,academic_year,name);

CREATE TABLE IF NOT EXISTS class_enrollments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'Aktif',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id,student_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON class_enrollments(license_id,class_id,status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(license_id,student_id,status);

CREATE TABLE IF NOT EXISTS teaching_assignments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id,class_id,subject_id)
);
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_license ON teaching_assignments(license_id,class_id,is_active);

ALTER TABLE attendance_days ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE student_notes ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_agendas ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE subject_schedules ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE report_notes ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_admin_items ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_officers ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_days_class_date ON attendance_days(license_id,class_id,attendance_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_items_class_key ON class_admin_items(license_id,class_id,item_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_officers_class_role ON class_officers(license_id,class_id,role_name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_duty_class_student_day ON duty_roster(license_id,class_id,student_id,day_name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_notes_class_student_term ON report_notes(license_id,class_id,student_id,academic_year,semester);

-- Existing licenses are migrated by lib/v5-schema.ts:
-- 1. Create one compatibility class from licenses.class_name.
-- 2. Enroll existing students in that class.
-- 3. Attach legacy class operational records to that class.
-- 4. Keep license/PIN/payment/device access intact.
-- 5. Leave v5_onboarding_completed=false so the teacher chooses Wali/Mapel/Keduanya once.

-- Runtime migration also drops the legacy report_notes unique constraint on
-- (license_id, student_id, academic_year, semester) before creating the V5 class-scoped index.


-- V6 — Kehadiran Pertemuan Guru Mata Pelajaran
CREATE TABLE IF NOT EXISTS subject_attendance_sessions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  meeting_no integer NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id,class_id,subject_id,meeting_date,meeting_no)
);
CREATE INDEX IF NOT EXISTS idx_subject_attendance_sessions ON subject_attendance_sessions(license_id,class_id,subject_id,meeting_date);

CREATE TABLE IF NOT EXISTS subject_attendance_records(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES subject_attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'Hadir',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id,student_id)
);
