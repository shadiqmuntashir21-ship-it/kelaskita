import { db } from '@/lib/db';

let pending: Promise<void> | null = null;

export function ensureV4Schema(){
  if(pending) return pending;
  pending=(async()=>{
    const sql=db();
    await sql`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS max_devices integer NOT NULL DEFAULT 5`;
    await sql`UPDATE licenses l SET onboarding_completed=true WHERE onboarding_completed=false AND EXISTS(SELECT 1 FROM students st WHERE st.license_id=l.id AND st.status<>'Dihapus')`;
    await sql`CREATE TABLE IF NOT EXISTS device_sessions (
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
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_device_sessions_license_active ON device_sessions(license_id,revoked_at,expires_at)`;
    await sql`CREATE TABLE IF NOT EXISTS import_batches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
      kind varchar(40) NOT NULL,
      source_name varchar(255),
      summary jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_import_batches_license ON import_batches(license_id,created_at DESC)`;
  })().catch(e=>{pending=null;throw e});
  return pending;
}
