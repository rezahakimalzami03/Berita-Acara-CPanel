import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-helpers';
import { resolveStoredFile } from '@/lib/storage';

// Menyajikan file dari storage lokal (Word/PDF/tanda tangan).
// Wajib login (middleware + withAuth), jadi dokumen berisi data pasien tidak
// bisa dibuka orang yang hanya punya link.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = {
  '.pdf': ['application/pdf', 'inline'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'attachment'],
  '.png': ['image/png', 'inline'],
};

function notFound() {
  return NextResponse.json({ ok: false, error: 'File tidak ditemukan.' }, { status: 404 });
}

export const GET = withAuth(async (req, ctx) => {
  const { path: segments } = await ctx.params;
  const full = resolveStoredFile(segments);
  const ext = full ? path.extname(full).toLowerCase() : '';
  if (!full || !TYPES[ext]) return notFound();

  let data;
  try {
    data = await fs.readFile(full);
  } catch {
    return notFound();
  }

  const [type, disposition] = TYPES[ext];
  const filename = path.basename(full);
  return new NextResponse(data, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(data.length),
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
