// Jalankan dari terminal (bukan dari browser):
//   node scripts/create-user.js <username> <password> "<Nama Lengkap>" [role]
//
// Contoh:
//   node scripts/create-user.js admin RahasiaKuat123 "Admin Utama" admin
//   node scripts/create-user.js nenny RahasiaJuga456 "Nenny Herlina" petugas
//
// WAJIB set DATABASE_URL dulu, contoh (Linux/Mac):
//   export DATABASE_URL="postgres://...."
//   node scripts/create-user.js ...
// (Windows PowerShell): $env:DATABASE_URL="postgres://...."

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const [username, password, namaLengkap, role = 'petugas'] = process.argv.slice(2);
  if (!username || !password || !namaLengkap) {
    console.error('Pemakaian: node scripts/create-user.js <username> <password> "<Nama Lengkap>" [role]');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL belum diset. Contoh: export DATABASE_URL="postgres://...."');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      `insert into users (username, password_hash, nama_lengkap, role)
       values ($1, $2, $3, $4)
       on conflict (username) do update set password_hash = excluded.password_hash, nama_lengkap = excluded.nama_lengkap, role = excluded.role`,
      [username, hash, namaLengkap, role]
    );
    console.log(`✅ User "${username}" (${role}) berhasil dibuat/diperbarui.`);
  } catch (err) {
    console.error('❌ Gagal:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
