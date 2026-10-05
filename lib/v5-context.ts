import {db} from '@/lib/db';
import {ensureV5Schema} from '@/lib/v5-schema';

export async function resolveClassContext(licenseId:string,requested?:string|null){
  await ensureV5Schema();
  const sql=db();
  if(requested){
    const rows=await sql`SELECT id,name,academic_year,is_homeroom FROM classes WHERE id=${requested} AND license_id=${licenseId} AND is_active=true LIMIT 1`;
    return rows[0]||null;
  }
  const rows=await sql`SELECT id,name,academic_year,is_homeroom FROM classes WHERE license_id=${licenseId} AND is_active=true ORDER BY is_homeroom DESC,updated_at DESC,created_at LIMIT 1`;
  return rows[0]||null;
}

export async function listWorkspaceContext(licenseId:string){
  await ensureV5Schema();
  const sql=db();
  const classes=await sql`SELECT id,name,academic_year,level,is_homeroom,is_active FROM classes WHERE license_id=${licenseId} AND is_active=true ORDER BY is_homeroom DESC,name`;
  const assignments=await sql`SELECT ta.id,ta.class_id,c.name class_name,ta.subject_id,s.name subject_name,ta.is_active FROM teaching_assignments ta JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.license_id=${licenseId} AND ta.is_active=true ORDER BY s.name,c.name`;
  return{classes,assignments};
}