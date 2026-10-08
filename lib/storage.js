import fs from 'node:fs/promises';
import path from 'node:path';

// Penyimpanan file (Word, PDF, tanda tangan) di DISK SERVER sendiri.
//
// Folder dasar diatur lewat env STORAGE_DIR (disarankan di luar folder kode,
// misalnya /home/rsuamira/berita-acara-files di cPanel). Kalau tidak diisi,
// dipakai folder "storage" di dalam proyek (untuk development lokal).
//
// File disajikan lewat route /files/... (app/files/[...path]/route.js) dan
// hanya bisa dibuka setelah login.

const URL_PREFIX = '/files/';

export function getStorageDir() {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), 'storage'));
}

/** Gabungkan folder dasar + path relatif, tolak kalau keluar dari folder dasar. */
function safeResolve(relPath) {
  const base = getStorageDir();
  const full = path.resolve(base, relPath);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error('Path file tidak valid.');
  }
  return full;
}

/** URL publik (relatif) untuk path relatif di storage. */
export function publicUrlFor(relPath) {
  return URL_PREFIX + relPath.split('/').map(encodeURIComponent).join('/');
}

/** Path relatif dari URL "/files/...", atau null kalau bukan URL storage lokal. */
function relPathFromUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith(URL_PREFIX)) return null;
  try {
    return url.slice(URL_PREFIX.length).split('/').map(decodeURIComponent).join('/');
  } catch {
    return null;
  }
}

/** Dipakai route /files: segmen URL -> path file di disk, atau null kalau tidak valid. */
export function resolveStoredFile(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const clean = [];
  for (const raw of segments) {
    let seg = raw;
    if (seg.includes('%')) {
      try { seg = decodeURIComponent(seg); } catch { return null; }
    }
    if (!seg || seg === '.' || seg === '..' || /[\\/\0]/.test(seg)) return null;
    clean.push(seg);
  }
  try {
    return safeResolve(clean.join('/'));
  } catch {
    return null;
  }
}

/** Simpan buffer ke storage, return URL (relatif) untuk disimpan di database. */
export async function uploadFile(relPath, buffer /* , contentType */) {
  const full = safeResolve(relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return publicUrlFor(relPath);
}

/** Simpan tanda tangan (data URL base64 dari kanvas), return URL. */
export async function uploadSignature(roleKey, dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  const rel = `signatures/${roleKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  return uploadFile(rel, buffer, 'image/png');
}

/** Baca file lokal berdasarkan URL "/files/..." (null kalau bukan lokal / tidak ada). */
export async function readFileByUrl(url) {
  const rel = relPathFromUrl(url);
  if (!rel) return null;
  try {
    return await fs.readFile(safeResolve(rel));
  } catch {
    return null;
  }
}

/** Hapus file berdasarkan URL. Best-effort: tidak pernah melempar error. */
export async function deleteFileByUrl(url) {
  try {
    const rel = relPathFromUrl(url);
    if (!rel) return; // URL lama (Google Drive / Supabase) dibiarkan
    await fs.unlink(safeResolve(rel));
  } catch {
    /* abaikan */
  }
}
