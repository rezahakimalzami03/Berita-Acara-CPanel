import { NextResponse } from 'next/server';
import { auth } from './auth';
import { query } from './db';

/** Bungkus handler API route supaya wajib login dulu. */
export function withAuth(handler) {
  return async (req, ctx) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Belum login.' }, { status: 401 });
    }
    return handler(req, ctx, session);
  };
}

/** Sama seperti withAuth, tapi WAJIB role admin (utk kelola Master Ruangan). */
export function withAdminAuth(handler) {
  return async (req, ctx) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Belum login.' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Hanya admin yang boleh mengelola Master Ruangan.' }, { status: 403 });
    }
    return handler(req, ctx, session);
  };
}

export function jsonError(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function jsonOk(data) {
  return NextResponse.json({ ok: true, ...data });
}


/**
 * Admin: boleh semua ruangan. Petugas: hanya ruangan yang diberikan admin
 * (tabel user_ruangan, diatur di menu Kelola User).
 */
export async function canAccessRuangan(session, ruanganId) {
  if (!session?.user || !ruanganId) return false;
  if (session.user.role === 'admin') return true;
  const res = await query(
    'select 1 from user_ruangan where user_id = $1 and ruangan_id = $2',
    [session.user.id, ruanganId]
  );
  return res.rows.length > 0;
}

export const FORBIDDEN_RUANGAN = 'Anda tidak punya hak akses ke ruangan ini. Hubungi admin.';

/**
 * Daftar id ruangan yang boleh dilihat/diubah user ini.
 * - admin  -> null (artinya SEMUA ruangan, tanpa filter)
 * - petugas -> array id ruangan dari tabel user_ruangan (bisa kosong = tidak ada akses)
 * Dipakai di SQL sbg: ($n::uuid[] is null or kolom_ruangan_id = any($n))
 */
export async function allowedRuanganIds(session) {
  if (!session?.user) return [];
  if (session.user.role === 'admin') return null;
  const res = await query('select ruangan_id from user_ruangan where user_id = $1', [session.user.id]);
  return res.rows.map((r) => r.ruangan_id);
}
