import { NextResponse } from 'next/server';
import { auth } from './auth';

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
