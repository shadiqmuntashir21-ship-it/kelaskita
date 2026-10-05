import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ message: 'Sesi berakhir.' }, { status: 401 });
  try {
    const b = await req.json();
    if (!String(b.name || '').trim()) return NextResponse.json({ message: 'Nama mata pelajaran wajib diisi.' }, { status: 400 });
    const sql = db();
    const r = await sql`INSERT INTO subjects(license_id,name,teacher_name,mastery_score) VALUES(${s.licenseId},${String(b.name).trim()},${b.teacher_name || null},${Number(b.mastery_score || 75)}) RETURNING id`;
    return NextResponse.json({ ok: true, id: r[0].id });
  } catch (e: any) {
    console.error(e);
    if (String(e?.message || '').toLowerCase().includes('unique')) return NextResponse.json({ message: 'Mata pelajaran tersebut sudah ada.' }, { status: 409 });
    return NextResponse.json({ message: 'Mata pelajaran belum berhasil ditambahkan.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ message: 'Sesi berakhir.' }, { status: 401 });
  try {
    const b = await req.json(); const sql = db();
    const r=await sql`UPDATE subjects SET name=${b.name},teacher_name=${b.teacher_name || null},mastery_score=${Number(b.mastery_score || 75)},updated_at=now() WHERE id=${b.id} AND license_id=${s.licenseId} AND (${b.expected_updated_at||null}::timestamptz IS NULL OR updated_at=${b.expected_updated_at||null}::timestamptz) RETURNING updated_at`;
    if(!r[0])return NextResponse.json({message:'Mata pelajaran sudah berubah dari perangkat lain. Muat ulang sebelum menyimpan.'},{status:409});
    return NextResponse.json({ ok: true,updated_at:r[0].updated_at });
  } catch (e) { console.error(e); return NextResponse.json({ message: 'Mata pelajaran belum berhasil diperbarui.' }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ message: 'Sesi berakhir.' }, { status: 401 });
  try {
    const { id } = await req.json(); const sql = db();
    await sql`DELETE FROM subjects WHERE id=${id} AND license_id=${s.licenseId}`;
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ message: 'Mata pelajaran belum berhasil dihapus.' }, { status: 500 }); }
}
