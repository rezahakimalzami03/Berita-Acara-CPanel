/** @type {import('next').NextConfig} */
const nextConfig = {
  // REVISI: pg, docx, dan @react-pdf/renderer punya dependensi native/Node
  // yang sebaiknya tidak ikut di-bundle webpack — biarkan tetap sebagai
  // modul Node biasa saat dijalankan di server (API routes).
  serverExternalPackages: ['pg', 'docx', '@react-pdf/renderer'],
};

export default nextConfig;
