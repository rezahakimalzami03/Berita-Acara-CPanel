'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { Card, Button, Input, Pill } from '@/components/ui';
import { Plus, Trash2, Loader2, AlertTriangle, Pencil, Check, X, ShieldAlert } from 'lucide-react';

const emptyNewItem = { nama: '', satuan: '', jumlahStandar: '', expDate: '', noBatch: '' };

function isNearExpiry(expDate) {
  if (!expDate) return false;
  const diff = (new Date(expDate) - new Date()) / (1000 * 60 * 60 * 24);
  return diff <= 30;
}
function isExpired(expDate) {
  if (!expDate) return false;
  return new Date(expDate) < new Date(new Date().toDateString());
}

export default function MasterPage() {
  const { data: session, status } = useSession();
  const [ruanganList, setRuanganList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingRuangan, setLoadingRuangan] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');
  const [newRuangan, setNewRuangan] = useState('');
  const [newItem, setNewItem] = useState(emptyNewItem);
  const [editingRuanganId, setEditingRuanganId] = useState(null);
  const [editingRuanganNama, setEditingRuanganNama] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItem, setEditingItem] = useState({});

  const isAdmin = session?.user?.role === 'admin';

  const loadRuangan = async () => {
    setLoadingRuangan(true);
    setError('');
    try {
      const d = await api.adminRuanganList();
      setRuanganList(d.ruangan);
      if (!selectedId && d.ruangan.length > 0) setSelectedId(d.ruangan[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRuangan(false);
    }
  };

  const loadItems = async (ruanganId) => {
    if (!ruanganId) return;
    setLoadingItems(true);
    try {
      const d = await api.adminItemList(ruanganId);
      setItems(d.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => { if (isAdmin) loadRuangan(); }, [isAdmin]); // eslint-disable-line
  useEffect(() => { if (selectedId) loadItems(selectedId); }, [selectedId]); // eslint-disable-line

  const addRuangan = async () => {
    if (!newRuangan.trim()) return;
    try {
      const d = await api.adminRuanganCreate(newRuangan.trim());
      setNewRuangan('');
      await loadRuangan();
      setSelectedId(d.ruangan.id);
    } catch (e) { setError(e.message); }
  };

  const saveRuanganRename = async (id) => {
    try {
      await api.adminRuanganUpdate(id, { nama: editingRuanganNama });
      setEditingRuanganId(null);
      await loadRuangan();
    } catch (e) { setError(e.message); }
  };

  const toggleRuanganAktif = async (r) => {
    try {
      await api.adminRuanganUpdate(r.id, { aktif: !r.aktif });
      await loadRuangan();
    } catch (e) { setError(e.message); }
  };

  const addItem = async () => {
    if (!newItem.nama.trim()) return;
    try {
      await api.adminItemCreate({ ruanganId: selectedId, ...newItem });
      setNewItem(emptyNewItem);
      await loadItems(selectedId);
    } catch (e) { setError(e.message); }
  };

  const startEditItem = (it) => {
    setEditingItemId(it.id);
    setEditingItem({
      nama: it.nama,
      satuan: it.satuan,
      jumlahStandar: it.jumlah_standar,
      expDate: it.exp_date ? it.exp_date.slice(0, 10) : '',
      noBatch: it.no_batch || '',
    });
  };

  const saveItemEdit = async (id) => {
    try {
      await api.adminItemUpdate(id, editingItem);
      setEditingItemId(null);
      await loadItems(selectedId);
    } catch (e) { setError(e.message); }
  };

  const toggleItemAktif = async (it) => {
    try {
      await api.adminItemUpdate(it.id, { aktif: !it.aktif });
      await loadItems(selectedId);
    } catch (e) { setError(e.message); }
  };

  if (status === 'loading') {
    return <Layout><div className="py-16 text-center text-slate-500"><Loader2 className="animate-spin inline" /></div></Layout>;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16">
          <ShieldAlert size={40} className="text-[var(--color-alert-600)] mx-auto mb-3" />
          <h2 className="font-display font-bold text-lg text-[var(--color-navy-900)] mb-1.5">Akses Terbatas</h2>
          <p className="text-sm text-slate-500">Halaman ini hanya bisa diakses oleh akun admin.</p>
        </div>
      </Layout>
    );
  }

  const selectedRuangan = ruanganList.find((r) => r.id === selectedId);

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Kelola Master Ruangan</h1>
          <p className="text-sm text-slate-500 mt-0.5">Daftar ruangan & standar obat/alat troli emergency</p>
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        <div className="grid md:grid-cols-[260px_1fr] gap-5">
          {/* Panel Ruangan */}
          <Card className="p-4 h-fit">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Ruangan / Unit</p>
            {loadingRuangan ? (
              <Loader2 size={16} className="animate-spin text-slate-400 mx-auto my-4" />
            ) : (
              <div className="space-y-1 mb-3">
                {ruanganList.map((r) => (
                  <div key={r.id} className={`rounded-lg px-2.5 py-2 flex items-center gap-2 cursor-pointer ${selectedId === r.id ? 'bg-[var(--color-navy-50)]' : 'hover:bg-slate-50'}`}>
                    {editingRuanganId === r.id ? (
                      <>
                        <input
                          autoFocus
                          className="flex-1 text-sm border border-[var(--color-line)] rounded px-1.5 py-1"
                          value={editingRuanganNama}
                          onChange={(e) => setEditingRuanganNama(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRuanganRename(r.id)}
                        />
                        <button onClick={() => saveRuanganRename(r.id)}><Check size={14} className="text-[var(--color-vital-600)]" /></button>
                        <button onClick={() => setEditingRuanganId(null)}><X size={14} className="text-slate-400" /></button>
                      </>
                    ) : (
                      <>
                        <span onClick={() => setSelectedId(r.id)} className={`flex-1 text-sm font-medium truncate ${r.aktif ? 'text-[var(--color-navy-900)]' : 'text-slate-400 line-through'}`}>
                          {r.nama}
                        </span>
                        <span className="text-[10px] text-slate-400">{r.jumlah_item}</span>
                        <button onClick={() => { setEditingRuanganId(r.id); setEditingRuanganNama(r.nama); }}>
                          <Pencil size={12} className="text-slate-400 hover:text-[var(--color-navy-700)]" />
                        </button>
                        <button onClick={() => toggleRuanganAktif(r)} title={r.aktif ? 'Nonaktifkan' : 'Aktifkan'}>
                          <Trash2 size={12} className={r.aktif ? 'text-slate-400 hover:text-[var(--color-alert-600)]' : 'text-[var(--color-vital-600)]'} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                placeholder="Ruangan baru..."
                className="!py-1.5 !text-sm"
                value={newRuangan}
                onChange={(e) => setNewRuangan(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRuangan()}
              />
              <Button variant="primary" className="!px-2.5 !py-1.5" onClick={addRuangan}><Plus size={15} /></Button>
            </div>
          </Card>

          {/* Panel Item */}
          <Card className="p-5">
            {!selectedRuangan ? (
              <p className="text-sm text-slate-400 text-center py-10">Pilih atau tambah ruangan dulu.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-display font-semibold text-[var(--color-navy-900)]">{selectedRuangan.nama}</h3>
                  {!selectedRuangan.aktif && <Pill tone="alert">Nonaktif</Pill>}
                </div>

                {loadingItems ? (
                  <Loader2 size={16} className="animate-spin text-slate-400 mx-auto my-6" />
                ) : (
                  <div className="overflow-x-auto thin-scroll mb-4">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          <th className="py-2 px-1">Nama Obat / Alat</th>
                          <th className="py-2 px-1 w-20">Satuan</th>
                          <th className="py-2 px-1 w-24">Jml. Standar</th>
                          <th className="py-2 px-1 w-28">No. Batch</th>
                          <th className="py-2 px-1 w-32">Exp. Date</th>
                          <th className="py-2 px-1 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const expired = isExpired(it.exp_date);
                          const near = !expired && isNearExpiry(it.exp_date);
                          return (
                            <tr key={it.id} className="border-t border-[var(--color-line)]">
                              {editingItemId === it.id ? (
                                <>
                                  <td className="py-1.5 px-1"><input className="w-full border border-[var(--color-line)] rounded px-1.5 py-1 text-sm" value={editingItem.nama} onChange={(e) => setEditingItem((v) => ({ ...v, nama: e.target.value }))} /></td>
                                  <td className="py-1.5 px-1"><input className="w-full border border-[var(--color-line)] rounded px-1.5 py-1 text-sm" value={editingItem.satuan} onChange={(e) => setEditingItem((v) => ({ ...v, satuan: e.target.value }))} /></td>
                                  <td className="py-1.5 px-1"><input type="number" className="w-full border border-[var(--color-line)] rounded px-1.5 py-1 text-sm" value={editingItem.jumlahStandar} onChange={(e) => setEditingItem((v) => ({ ...v, jumlahStandar: e.target.value }))} /></td>
                                  <td className="py-1.5 px-1"><input className="w-full border border-[var(--color-line)] rounded px-1.5 py-1 text-sm" value={editingItem.noBatch} onChange={(e) => setEditingItem((v) => ({ ...v, noBatch: e.target.value }))} /></td>
                                  <td className="py-1.5 px-1"><input type="date" className="w-full border border-[var(--color-line)] rounded px-1.5 py-1 text-sm" value={editingItem.expDate} onChange={(e) => setEditingItem((v) => ({ ...v, expDate: e.target.value }))} /></td>
                                  <td className="py-1.5 px-1"><div className="flex gap-3">
                                    <button className="p-1 -m-1" onClick={() => saveItemEdit(it.id)}><Check size={15} className="text-[var(--color-vital-600)]" /></button>
                                    <button className="p-1 -m-1" onClick={() => setEditingItemId(null)}><X size={15} className="text-slate-400" /></button>
                                  </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className={`py-1.5 px-1 font-medium ${it.aktif ? 'text-[var(--color-navy-900)]' : 'text-slate-400 line-through'}`}>{it.nama}</td>
                                  <td className="py-1.5 px-1 text-slate-500">{it.satuan}</td>
                                  <td className="py-1.5 px-1 text-slate-500">{it.jumlah_standar}</td>
                                  <td className="py-1.5 px-1 text-slate-500">{it.no_batch || '-'}</td>
                                  <td className="py-1.5 px-1">
                                    {it.exp_date ? (
                                      <span className={expired ? 'text-[var(--color-alert-700)] font-semibold' : near ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                                        {it.exp_date.slice(0, 10).split('-').reverse().join('/')}
                                        {expired && ' (expired)'}
                                        {near && !expired && ' (segera)'}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="py-1.5 px-1"><div className="flex gap-3">
                                    <button className="p-1 -m-1" onClick={() => startEditItem(it)}><Pencil size={13} className="text-slate-400 hover:text-[var(--color-navy-700)]" /></button>
                                    <button className="p-1 -m-1" onClick={() => toggleItemAktif(it)} title={it.aktif ? 'Nonaktifkan' : 'Aktifkan'}>
                                      <Trash2 size={13} className={it.aktif ? 'text-slate-400 hover:text-[var(--color-alert-600)]' : 'text-[var(--color-vital-600)]'} />
                                    </button>
                                  </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                        {items.length === 0 && (
                          <tr><td colSpan={6} className="text-center text-slate-400 py-6">Belum ada obat/alat di ruangan ini.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-3 border-t border-[var(--color-line)]">
                  <input placeholder="Nama obat/alat" className="col-span-2 sm:flex-1 sm:min-w-[160px] rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm" value={newItem.nama} onChange={(e) => setNewItem((v) => ({ ...v, nama: e.target.value }))} />
                  <input placeholder="Satuan" className="sm:w-20 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm" value={newItem.satuan} onChange={(e) => setNewItem((v) => ({ ...v, satuan: e.target.value }))} />
                  <input type="number" placeholder="Standar" className="sm:w-24 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm" value={newItem.jumlahStandar} onChange={(e) => setNewItem((v) => ({ ...v, jumlahStandar: e.target.value }))} />
                  <input placeholder="No. Batch (opsional)" className="sm:w-32 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm" value={newItem.noBatch} onChange={(e) => setNewItem((v) => ({ ...v, noBatch: e.target.value }))} />
                  <input type="date" placeholder="Exp. Date" className="sm:w-36 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm" value={newItem.expDate} onChange={(e) => setNewItem((v) => ({ ...v, expDate: e.target.value }))} />
                  <Button variant="primary" className="col-span-2 sm:col-span-1" onClick={addItem}><Plus size={15} /> Tambah</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}