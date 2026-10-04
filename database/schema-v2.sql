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
