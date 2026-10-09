'use client';

// Client-side fetch wrapper. Karena frontend & backend berada di 1 proyek
// Next.js yang sama (same-origin), tidak ada masalah CORS sama sekali —
// cukup fetch relatif ke /api/... dengan cookie session otomatis terkirim.

async function call(path, { method = 'GET', params, body } = {}) {
  let url = path;
  if (params) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))
    ).toString();
    url += `?${qs}`;
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok && !data.duplicate) {
    throw new Error(data.error || `Gagal memuat ${path}`);
  }
  return data;
}

export const api = {
  ruanganList: () => call('/api/ruangan'),
  formDefaults: (ruanganId, jenis) => call('/api/form-defaults', { params: { ruanganId, jenis } }),
  previewNomor: (tanggal, jenis) => call('/api/preview-nomor', { params: { tanggal, jenis } }),
  generate: (payload) => call('/api/generate', { method: 'POST', body: payload }),
  dashboard: (dari, sampai) => call('/api/dashboard', { params: { dari, sampai } }),
  riwayat: (params) => call('/api/riwayat', { params }),
  rekapRuangan: (ruanganId, dari, sampai) => call('/api/rekap-ruangan', { params: { ruanganId, dari, sampai } }),

  // ---------- Kelola Master Ruangan (khusus admin) ----------
  adminRuanganList: () => call('/api/admin/ruangan'),
  adminRuanganCreate: (nama) => call('/api/admin/ruangan', { method: 'POST', body: { nama } }),
  adminRuanganUpdate: (id, payload) => call(`/api/admin/ruangan/${id}`, { method: 'PATCH', body: payload }),
  adminRuanganDelete: (id) => call(`/api/admin/ruangan/${id}`, { method: 'DELETE' }),

  adminItemList: (ruanganId) => call('/api/admin/item', { params: { ruanganId } }),
  adminItemCreate: (payload) => call('/api/admin/item', { method: 'POST', body: payload }),
  adminItemUpdate: (id, payload) => call(`/api/admin/item/${id}`, { method: 'PATCH', body: payload }),
  adminItemDelete: (id) => call(`/api/admin/item/${id}`, { method: 'DELETE' }),
  // ---------- Kelola User (khusus admin) ----------
  adminUserList: () => call('/api/admin/user'),
  adminUserCreate: (payload) => call('/api/admin/user', { method: 'POST', body: payload }),
  adminUserUpdate: (id, payload) => call(`/api/admin/user/${id}`, { method: 'PATCH', body: payload }),
  adminUserRuanganGet: (id) => call(`/api/admin/user/${id}/ruangan`),
  adminUserRuanganSet: (id, ruanganIds) => call(`/api/admin/user/${id}/ruangan`, { method: 'PUT', body: { ruanganIds } }),
  adminUserDelete: (id) => call(`/api/admin/user/${id}`, { method: 'DELETE' }),
  // ---------- Audit Log (khusus admin) ----------
  auditLog: (params) => call('/api/admin/audit-log', { params }),

  // ---------- Notifikasi (semua user) ----------
  notifikasi: () => call('/api/notifikasi'),
};
