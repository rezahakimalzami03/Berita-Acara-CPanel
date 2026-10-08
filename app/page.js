'use client';
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { Card, Button, Field, Input, Select, Textarea, SectionTitle } from '@/components/ui';
import SignaturePad from '@/components/SignaturePad';
import SealBadge from '@/components/SealBadge';
import { CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';

const emptyForm = {
  jenis: 'Pembukaan', tanggal: '', pukul: '', ruanganId: '',
  nomorSegel: '', kondisiSegel: '', alasan: '', namaPasien: '', noRM: '', catatan: '',
  petugas1: '', petugas2: '', kepala: '',
};

export default function FormPage() {
  const [ruanganList, setRuanganList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [labelD, setLabelD] = useState('Jml. Standar');
  const [labelE, setLabelE] = useState('Jml. Terpakai');
  const [nomor, setNomor] = useState('');
  const [ttd, setTtd] = useState({ petugas1: null, petugas2: null, kepala: null });
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [dupConfirm, setDupConfirm] = useState(null);

  useEffect(() => {
    api.ruanganList().then((d) => setRuanganList(d.ruangan || [])).catch((e) => setError(e.message));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const ruanganNama = ruanganList.find((r) => r.id === form.ruanganId)?.nama || '';

  const loadItems = useCallback(async (ruanganId, jenis) => {
    if (!ruanganId || !jenis) { setItems([]); return; }
    setLoadingItems(true);
    setError('');
    try {
      const d = await api.formDefaults(ruanganId, jenis);
      setItems(d.items.map((it) => ({ ...it, kolomE: '', keterangan: '' })));
      setLabelD(d.labelD);
      setLabelE(d.labelE);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => { loadItems(form.ruanganId, form.jenis); }, [form.ruanganId, form.jenis, loadItems]);

  useEffect(() => {
    if (form.tanggal && form.jenis) {
      api.previewNomor(form.tanggal, form.jenis).then((d) => setNomor(d.nomor)).catch(() => {});
    } else {
      setNomor('');
    }
  }, [form.tanggal, form.jenis]);

  const updateItem = (idx, key, val) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  };

  const isPenutupan = form.jenis === 'Penutupan';

  const buildPayload = (confirmDuplicate) => ({
    ...form, ruanganNama, items, ttd, confirmDuplicate: !!confirmDuplicate,
  });

  const submit = async (confirmDuplicate = false) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await api.generate(buildPayload(confirmDuplicate));
      if (res.duplicate) {
        setDupConfirm(res.dupInfo);
        setSubmitting(false);
        return;
      }
      setSuccess(res);
      setDupConfirm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setForm(emptyForm);
    setItems([]);
    setTtd({ petugas1: null, petugas2: null, kepala: null });
    setSuccess(null);
    setNomor('');
  };

  return (
    <Layout>
      {success ? (
        <div className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 rounded-full bg-[var(--color-vital-100)] flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-[var(--color-vital-600)]" />
          </div>
          <h2 className="font-display text-xl font-bold text-[var(--color-navy-900)] mb-1.5">Dokumen berhasil dibuat</h2>
          <p className="text-sm text-slate-500 mb-5">{success.docName}</p>
          <div className="flex justify-center mb-6"><SealBadge nomor={success.nomor} jenis={form.jenis} /></div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href={success.docxUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" className="w-full sm:w-auto"><ExternalLink size={15} /> Unduh Word</Button>
            </a>
            <a href={success.pdfUrl} target="_blank" rel="noreferrer">
              <Button variant="primary" className="w-full sm:w-auto"><ExternalLink size={15} /> Unduh PDF</Button>
            </a>
          </div>
          <Button variant="success" onClick={resetAll}>Buat Berita Acara Baru</Button>
        </div>
      ) : (
        <div className="space-y-6 pb-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Buat Berita Acara</h1>
              <p className="text-sm text-slate-500 mt-0.5">Pembukaan atau penutupan troli emergency</p>
            </div>
            {nomor && <SealBadge nomor={nomor} jenis={form.jenis} />}
          </div>

          {error && (
            <div className="rounded-xl bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-4 py-3 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {dupConfirm && (
            <div className="rounded-xl bg-[var(--color-seal-50)] border border-[var(--color-seal-100)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--color-seal-700)] flex items-center gap-2 mb-1.5">
                <AlertTriangle size={16} /> Kemungkinan Berita Acara Ganda
              </p>
              <p className="text-sm text-[var(--color-navy-900)] mb-3">
                Sudah ada Berita Acara serupa: <strong>{dupConfirm.nomor}</strong>. Tetap buat dokumen baru?
              </p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={() => submit(true)}>Ya, tetap buat</Button>
                <Button variant="ghost" onClick={() => setDupConfirm(null)}>Batalkan</Button>
              </div>
            </div>
          )}

          <Card className="p-5 md:p-6">
            <SectionTitle step="1" title="Data Berita Acara" desc="Isi keterangan umum kejadian" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Jenis Berita Acara" required>
                <Select value={form.jenis} onChange={set('jenis')}>
                  <option value="Pembukaan">Pembukaan</option>
                  <option value="Penutupan">Penutupan</option>
                </Select>
              </Field>
              <Field label="Ruangan / Unit" required>
                <Select value={form.ruanganId} onChange={set('ruanganId')}>
                  <option value="">Pilih ruangan...</option>
                  {ruanganList.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
                </Select>
              </Field>
              <Field label="Tanggal" required>
                <Input type="date" value={form.tanggal} onChange={set('tanggal')} />
              </Field>
              <Field label="Pukul (WIB)">
                <Input type="time" value={form.pukul} onChange={set('pukul')} />
              </Field>
              <Field label={isPenutupan ? 'Nomor Segel Baru' : 'Nomor Segel (Awal/Baru)'}>
                <Input value={form.nomorSegel} onChange={set('nomorSegel')} placeholder="Nomor segel troli" />
              </Field>
              {!isPenutupan && (
                <Field label="Kondisi Segel Saat Ditemukan">
                  <Select value={form.kondisiSegel} onChange={set('kondisiSegel')}>
                    <option value="">Pilih...</option>
                    <option value="Baik">Baik</option>
                    <option value="Rusak">Rusak</option>
                    <option value="Hilang">Hilang</option>
                  </Select>
                </Field>
              )}
              <Field label={isPenutupan ? 'Alasan Penutupan' : 'Alasan Pembukaan'} className="sm:col-span-2">
                <Input value={form.alasan} onChange={set('alasan')} placeholder="Alasan tindakan dilakukan" />
              </Field>
              <Field label="Nama Pasien" hint="jika dipakai untuk pasien tertentu">
                <Input value={form.namaPasien} onChange={set('namaPasien')} />
              </Field>
              <Field label="Nomor Rekam Medis" hint="jika ada">
                <Input value={form.noRM} onChange={set('noRM')} />
              </Field>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <SectionTitle step="2" title="Daftar Obat / Alat" desc={`Isi kolom "${labelE}" sesuai kondisi saat ini`} />
            {loadingItems ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
                <Loader2 size={16} className="animate-spin" /> Memuat daftar obat...
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Pilih Ruangan/Unit untuk memuat daftar obat & alat.</p>
            ) : (
              <div className="overflow-x-auto thin-scroll -mx-1">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="py-2 px-1 w-8">No</th>
                      <th className="py-2 px-1">Nama Obat / Alat</th>
                      <th className="py-2 px-1 w-20">Satuan</th>
                      <th className="py-2 px-1 w-24">{labelD}</th>
                      <th className="py-2 px-1 w-28">{labelE}</th>
                      <th className="py-2 px-1 w-40">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.nama} className="border-t border-[var(--color-line)]">
                        <td className="py-1.5 px-1 text-slate-400">{it.no}</td>
                        <td className="py-1.5 px-1 font-medium text-[var(--color-navy-900)]">{it.nama}</td>
                        <td className="py-1.5 px-1 text-slate-500">{it.satuan}</td>
                        <td className="py-1.5 px-1 text-slate-500">{it.kolomD}</td>
                        <td className="py-1.5 px-1">
                          <input
                            type="number" min="0" placeholder="0"
                            className="w-full rounded-md border border-[var(--color-line)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-700)]/30"
                            value={it.kolomE}
                            onChange={(e) => updateItem(idx, 'kolomE', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <input
                            type="text" placeholder="-"
                            className="w-full rounded-md border border-[var(--color-line)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-700)]/30"
                            value={it.keterangan}
                            onChange={(e) => updateItem(idx, 'keterangan', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5 md:p-6">
            <SectionTitle step="3" title="Tanda Tangan" desc={isPenutupan ? 'Petugas 1, Petugas 2, & Kepala Ruangan wajib' : 'Petugas 1 & Petugas 2 wajib'} />
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Field label="Nama Petugas 1" required><Input value={form.petugas1} onChange={set('petugas1')} /></Field>
                <SignaturePad label="Petugas 1" value={ttd.petugas1} onChange={(v) => setTtd((t) => ({ ...t, petugas1: v }))} />
              </div>
              <div className="space-y-2.5">
                <Field label="Nama Petugas 2" required><Input value={form.petugas2} onChange={set('petugas2')} /></Field>
                <SignaturePad label="Petugas 2" value={ttd.petugas2} onChange={(v) => setTtd((t) => ({ ...t, petugas2: v }))} />
              </div>
              {isPenutupan && (
                <div className="space-y-2.5 sm:col-span-2">
                  <Field label="Nama Kepala Ruangan" required><Input value={form.kepala} onChange={set('kepala')} /></Field>
                  <SignaturePad label="Kepala Ruangan" value={ttd.kepala} onChange={(v) => setTtd((t) => ({ ...t, kepala: v }))} />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <SectionTitle step="4" title="Catatan / Tindak Lanjut" />
            <Textarea value={form.catatan} onChange={set('catatan')} placeholder="Opsional" />
          </Card>

          <div className="flex justify-end sticky bottom-4 md:bottom-6">
            <Button variant="success" className="px-6 py-3 text-base shadow-lg" onClick={() => submit(false)} disabled={submitting || !!dupConfirm}>
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {submitting ? 'Membuat dokumen...' : 'Buat Dokumen Berita Acara'}
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
