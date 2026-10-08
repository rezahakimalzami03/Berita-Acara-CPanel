import { createClient } from '@supabase/supabase-js';

let supabase;
function getClient() {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur.');
    }
    // REVISI: pakai SERVICE ROLE KEY (bukan anon key) karena upload dilakukan
    // dari server (API route), bukan dari browser — service role bypass RLS
    // dan tidak pernah diekspos ke client.
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

const BUCKET = 'berita-acara';

/** Upload buffer/blob ke Supabase Storage, return URL publik. */
export async function uploadFile(path, buffer, contentType) {
  const client = getClient();
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error('Gagal upload file: ' + error.message);
  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Simpan tanda tangan (data URL base64 dari kanvas) ke Storage, return URL. */
export async function uploadSignature(roleKey, dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  const path = `signatures/${roleKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  return uploadFile(path, buffer, 'image/png');
}
