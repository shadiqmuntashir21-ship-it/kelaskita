-- KelasKita V4: onboarding, import audit, dan registrasi perangkat cloud
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS max_devices integer NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  device_key varchar(128) NOT NULL,
  device_name varchar(180) NOT NULL DEFAULT 'Perangkat',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  revoked_at timestamptz,
  UNIQUE(license_id,device_key)
);
CREATE INDEX IF NOT EXISTS idx_device_sessions_license_active ON device_sessions(license_id,revoked_at,expires_at);

CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  kind varchar(40) NOT NULL,
  source_name varchar(255),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_batches_license ON import_batches(license_id,created_at DESC);
