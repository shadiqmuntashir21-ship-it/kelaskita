import {db} from '@/lib/db';
import {ensureV4Schema} from '@/lib/v4-schema';

let pending:Promise<void>|null=null;

export function ensureV5Schema(){
  if(pending)return pending;
  pending=(async()=>{
    await ensureV4Schema();
    const sql=db();

    await sql`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS usage_mode varchar(20)`;
    await sql`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS v5_onboarding_completed boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS v5_migrated_at timestamptz`;

    await sql`CREATE TABLE IF NOT EXISTS classes(
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
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_classes_license ON classes(license_id,is_active,academic_year,name)`;

    await sql`CREATE TABLE IF NOT EXISTS class_enrollments(
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
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enrollments_class ON class_enrollments(license_id,class_id,status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(license_id,student_id,status)`;

    await sql`CREATE TABLE IF NOT EXISTS teaching_assignments(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
      class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(license_id,class_id,subject_id)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_teaching_assignments_license ON teaching_assignments(license_id,class_id,is_active)`;
    await sql`CREATE TABLE IF NOT EXISTS subject_attendance_sessions(
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
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subject_attendance_sessions ON subject_attendance_sessions(license_id,class_id,subject_id,meeting_date)`;
    await sql`CREATE TABLE IF NOT EXISTS subject_attendance_records(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid NOT NULL REFERENCES subject_attendance_sessions(id) ON DELETE CASCADE,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status varchar(30) NOT NULL DEFAULT 'Hadir',
      note text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(session_id,student_id)
    )`;

    await sql`ALTER TABLE attendance_days ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE student_notes ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE achievements ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE class_agendas ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE subject_schedules ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE report_notes ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE class_admin_items ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE class_officers ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE`;

    await sql`DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='attendance_days_license_id_attendance_date_key') THEN
        ALTER TABLE attendance_days DROP CONSTRAINT attendance_days_license_id_attendance_date_key;
      END IF;
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='class_admin_items_license_id_item_key_key') THEN
        ALTER TABLE class_admin_items DROP CONSTRAINT class_admin_items_license_id_item_key_key;
      END IF;
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='class_officers_license_id_role_name_key') THEN
        ALTER TABLE class_officers DROP CONSTRAINT class_officers_license_id_role_name_key;
      END IF;
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='duty_roster_license_id_student_id_day_name_key') THEN
        ALTER TABLE duty_roster DROP CONSTRAINT duty_roster_license_id_student_id_day_name_key;
      END IF;
      IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='report_notes_license_id_student_id_academic_year_semester_key') THEN
        ALTER TABLE report_notes DROP CONSTRAINT report_notes_license_id_student_id_academic_year_semester_key;
      END IF;
    END $$`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_days_class_date ON attendance_days(license_id,class_id,attendance_date)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_items_class_key ON class_admin_items(license_id,class_id,item_key)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_officers_class_role ON class_officers(license_id,class_id,role_name)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_duty_class_student_day ON duty_roster(license_id,class_id,student_id,day_name)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_report_notes_class_student_term ON report_notes(license_id,class_id,student_id,academic_year,semester)`;

    // Setiap lisensi lama mendapat satu kelas kompatibilitas dari class_name yang sudah ada.
    await sql`INSERT INTO classes(license_id,name,academic_year,is_homeroom)
      SELECT id,COALESCE(NULLIF(trim(class_name),''),'Kelas Utama'),academic_year,true
      FROM licenses
      WHERE usage_mode IS NULL
      ON CONFLICT(license_id,academic_year,name) DO NOTHING`;

    // Hubungkan seluruh siswa lama ke kelas kompatibilitas tanpa menghapus data apa pun.
    await sql`INSERT INTO class_enrollments(license_id,class_id,student_id)
      SELECT st.license_id,c.id,st.id
      FROM students st
      JOIN licenses l ON l.id=st.license_id
      JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year
        AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama')
      WHERE st.status<>'Dihapus'
      ON CONFLICT(class_id,student_id) DO NOTHING`;

    // Tempelkan data operasional lama ke kelas kompatibilitas.
    await sql`UPDATE attendance_days x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE student_notes x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE achievements x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE follow_ups x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE class_agendas x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE assessments x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE subject_schedules x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE report_notes x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE class_admin_items x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE class_officers x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;
    await sql`UPDATE duty_roster x SET class_id=c.id FROM licenses l JOIN classes c ON c.license_id=l.id AND c.academic_year=l.academic_year AND c.name=COALESCE(NULLIF(trim(l.class_name),''),'Kelas Utama') WHERE x.license_id=l.id AND x.class_id IS NULL`;

    await sql`UPDATE licenses SET v5_migrated_at=COALESCE(v5_migrated_at,now())`;
  })().catch(e=>{pending=null;throw e});
  return pending;
}
