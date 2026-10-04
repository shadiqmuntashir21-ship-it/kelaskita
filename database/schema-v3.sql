
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
