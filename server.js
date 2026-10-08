// Startup file untuk cPanel "Setup Node.js App" (Passenger).
// Menjalankan Next.js (hasil `npm run build`) sebagai server Node biasa.
const { createServer } = require('http');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Berita Acara siap di port ${port}`);
  });
});
