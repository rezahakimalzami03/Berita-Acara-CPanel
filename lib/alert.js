'use client';
import Swal from 'sweetalert2';

// Pembungkus SweetAlert2 dengan warna senada tema aplikasi.
const NAVY = '#1b3358';
const RED = '#b42318';

const base = Swal.mixin({
  confirmButtonColor: NAVY,
  cancelButtonColor: '#64748b',
  reverseButtons: true,
  heightAuto: false,
  scrollbarPadding: false,
  focusCancel: false,
});

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  heightAuto: false,
});

/** Dialog konfirmasi. Mengembalikan true kalau user menekan tombol konfirmasi. */
export async function confirmAction({
  title = 'Apakah Anda yakin?',
  text,
  html,
  confirmText = 'Ya, lanjutkan',
  cancelText = 'Batal',
  icon = 'question',
  danger = false,
} = {}) {
  const res = await base.fire({
    title, text, html, icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? RED : NAVY,
  });
  return res.isConfirmed;
}

/** Pesan kesalahan (error dari server / aksi gagal). */
export function alertError(text, title = 'Terjadi kesalahan') {
  return base.fire({ icon: 'error', title, text: String(text || ''), confirmButtonText: 'Tutup' });
}

/** Validasi form gagal. `messages` boleh string atau array string (ditampilkan sebagai daftar). */
export function alertWarning(messages, title = 'Periksa kembali isian Anda') {
  const list = Array.isArray(messages) ? messages : [messages];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = list.length > 1
    ? `<ul style="text-align:left;margin:0 0 0 1.1rem;list-style:disc;font-size:.9rem">${list.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`
    : `<span style="font-size:.95rem">${esc(list[0])}</span>`;
  return base.fire({ icon: 'warning', title, html, confirmButtonText: 'Mengerti' });
}

/** Notifikasi singkat berhasil (toast di pojok kanan atas). */
export function alertSuccess(text) {
  return toast.fire({ icon: 'success', title: text });
}
