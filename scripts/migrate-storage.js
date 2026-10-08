// Pindahkan file lama dari Supabase Storage ke storage lokal server,
// lalu perbarui URL-nya di tabel berita_acara.
//
// Jalankan di SERVER (cPanel Terminal, di folder aplikasi), karena database
// cPanel hanya bisa diakses dari server itu sendiri:
//
//   export DATABASE_URL="postgresql://USER:PASS@localhost:5432/NAMADB"
//   export STORAGE_DIR="/home/rsuamira/berita-acara-files"
//   node scripts/migrate-storage.js --dry     # uji coba, tidak mengubah apa pun
//   node scripts/migrate-storage.js           # eksekusi sungguhan
//
// Aman dijalankan ulang: hanya baris yang masih berisi URL Supabase yang diproses.
// Link Google Drive/Docs lama tidak disentuh.

const { Pool } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');

const DRY = process.argv.includes('--dry');
const COLS = ['docx_url', 'pdf_url', 'petugas1_ttd_url', 'petugas2_ttd_url', 'kepala_ttd_url'];
const MARK = '/storage/v1/object/public/berita-acara/';

const baseDir = path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), 'storage'));

function relFromSupabaseUrl(url) {
  if (typeof url !== 'string' || !url.includes('supabase.co') || !url.includes(MARK)) return null;
  const tail = url.split(MARK)[1].split('?')[0];
  try {
    return tail.split('/').map(decodeURIComponent).join('/');
  } catch {
    return null;
  }
}

function localUrl(rel) {
  return '/files/' + rel.split('/').map(encodeURIComponent).join('/');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL belum diset.');
    process.exit(1);
  }
  const useSsl = process.env.DATABASE_SSL === 'true' || /supabase\.(co|com)/.test(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : false });

  console.log(`Folder tujuan : ${baseDir}`);
  console.log(`Mode          : ${DRY ? 'UJI COBA (tidak mengubah apa pun)' : 'EKSEKUSI'}`);

  const where = COLS.map((c) => `${c} like '%supabase.co/storage/%'`).join(' or ');
  const { rows } = await pool.query(`select id, nomor, ${COLS.join(', ')} from berita_acara where ${where}`);
  console.log(`Berita acara dengan file Supabase: ${rows.length}\n`);

  const cache = new Map(); // url lama -> url baru
  let ok = 0, gagal = 0;

  for (const row of rows) {
    for (const col of COLS) {
      const oldUrl = row[col];
      const rel = relFromSupabaseUrl(oldUrl);
      if (!rel) continue;
      if (rel.split('/').some((s) => !s || s === '..' || s === '.')) {
        console.log(`LEWATI  ${row.nomor} ${col}: path tidak valid`);
        gagal++;
        continue;
      }
      try {
        let newUrl = cache.get(oldUrl);
        if (!newUrl) {
          const dest = path.resolve(baseDir, rel);
          if (!dest.startsWith(baseDir + path.sep)) throw new Error('path di luar folder tujuan');
          const res = await fetch(oldUrl);
          if (!res.ok) throw new Error(`unduh gagal (HTTP ${res.status})`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (!DRY) {
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.writeFile(dest, buf);
          }
          newUrl = localUrl(rel);
          cache.set(oldUrl, newUrl);
        }
        if (!DRY) await pool.query(`update berita_acara set ${col} = $1 where id = $2`, [newUrl, row.id]);
        console.log(`${DRY ? 'AKAN ' : 'OK    '} ${row.nomor} ${col} -> ${newUrl}`);
        ok++;
      } catch (err) {
        console.log(`GAGAL   ${row.nomor} ${col}: ${err.message}`);
        gagal++;
      }
    }
  }

  console.log(`\nSelesai. Berhasil: ${ok}, gagal/dilewati: ${gagal}, file unik: ${cache.size}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
