// Startup file untuk cPanel "Setup Node.js App" (Passenger).
// Menjalankan Next.js (hasil `npm run build`) sebagai server Node biasa.
//
// Juga menulis log startup/error ke app-debug.log (di folder aplikasi) supaya
// masalah di server mudah dilacak. Yang dicatat hanya ADA/TIDAKNYA variabel
// environment dan panjangnya — nilai rahasia tidak pernah ditulis.
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const next = require('next');

const LOG_FILE = process.env.APP_LOG_FILE || path.join(process.cwd(), 'app-debug.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* abaikan */ }
  console.log(line);
}

process.on('uncaughtException', (e) => log('uncaughtException: ' + ((e && e.stack) || e)));
process.on('unhandledRejection', (e) => log('unhandledRejection: ' + ((e && e.stack) || e)));

log(`start node=${process.version} cwd=${process.cwd()} NODE_ENV=${process.env.NODE_ENV}`);
for (const k of ['DATABASE_URL', 'AUTH_SECRET', 'AUTH_TRUST_HOST', 'RS_CODE', 'STORAGE_DIR']) {
  const v = process.env[k];
  const bad = v && /["'`\s\\]/.test(v) ? ' | PERINGATAN: mengandung kutip/spasi/backslash' : '';
  log(`env ${k}: ${v ? 'ada, panjang ' + v.length + bad : 'KOSONG / TIDAK TERBACA'}`);
}

const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    log(`Berita Acara siap di port ${port}`);
  });
}).catch((e) => log('gagal prepare: ' + ((e && e.stack) || e)));
