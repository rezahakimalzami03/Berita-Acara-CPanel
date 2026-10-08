'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { Card, Button, Input, Select, Pill } from '@/components/ui';
import { Plus, Loader2, AlertTriangle, Pencil, Check, X, ShieldAlert, KeyRound, UserX, UserCheck } from 'lucide-react';

const emptyForm = { username: '', password: '', namaLengkap: '', role: 'petugas' };

export default function UsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [newUser, setNewUser] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingUser, setEditingUser] = useState({});

  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  const isAdmin = session?.user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.adminUserList();
      setUsers(d.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]); // eslint-disable-line

  const flash = (msg) => {
    setInfo(msg);
    setTimeout(() => setInfo(''), 3000);
  };

  const createUser = async () => {
    setError('');
    if (!newUser.username.trim() || !newUser.password || !newUser.namaLengkap.trim()) {
      return setError('Username, password, dan nama lengkap wajib diisi.');
    }
    setCreating(true);
    try {
      await api.adminUserCreate(newUser);
      setNewUser(emptyForm);
      await load();
      flash('User baru berhasil dibuat.');
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditingUser({ namaLengkap: u.nama_lengkap, role: u.role });
  };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.adminUserUpdate(id, editingUser);
      setEditingId(null);
      await load();
      flash('Perubahan disimpan.');
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleAktif = async (u) => {
    setError('');
    try {
      if (u.aktif) {
        await api.adminUserDelete(u.id); // soft-delete: set aktif=false
      } else {
        await api.adminUserUpdate(u.id, { aktif: true });
      }
      await load();
      flash(u.aktif ? 'User dinonaktifkan.' : 'User diaktifkan kembali.');
    } catch (e) {
      setError(e.message);
    }
  };

  const submitReset = async (id) => {
    setError('');
    if (!resetPassword || resetPassword.length < 6) {
      return setError('Password baru minimal 6 karakter.');
    }
    try {
      await api.adminUserUpdate(id, { password: resetPassword });
      setResetId(null);
      setResetPassword('');
      flash('Password berhasil direset.');
    } catch (e) {
      setError(e.message);
    }
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

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Kelola User & Role</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tambah petugas, atur role, reset password, nonaktifkan akun</p>
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}
        {info && (
          <div className="rounded-xl bg-[var(--color-vital-50)] border border-[var(--color-vital-100)] text-[var(--color-vital-700)] text-sm px-4 py-3">
            {info}
          </div>
        )}

        {/* Form tambah user */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Tambah User Baru</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input placeholder="Username" value={newUser.username} onChange={(e) => setNewUser((v) => ({ ...v, username: e.target.value }))} />
            <Input placeholder="Nama Lengkap" value={newUser.namaLengkap} onChange={(e) => setNewUser((v) => ({ ...v, namaLengkap: e.target.value }))} />
            <Input type="password" placeholder="Password (min. 6 karakter)" value={newUser.password} onChange={(e) => setNewUser((v) => ({ ...v, password: e.target.value }))} />
            <Select value={newUser.role} onChange={(e) => setNewUser((v) => ({ ...v, role: e.target.value }))}>
              <option value="petugas">Petugas</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <Button variant="primary" className="mt-3" onClick={createUser} disabled={creating}>
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Tambah User
          </Button>
        </Card>

        {/* Daftar user */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Daftar User</h3>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-slate-400 mx-auto my-6" />
          ) : (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="py-2 px-1">Username</th>
                    <th className="py-2 px-1">Nama Lengkap</th>
                    <th className="py-2 px-1 w-32">Role</th>
                    <th className="py-2 px-1 w-24">Status</th>
                    <th className="py-2 px-1 w-40"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === session.user.id;
                    return (
                      <tr key={u.id} className="border-t border-[var(--color-line)] align-top">
                        <td className="py-2 px-1 font-medium text-[var(--color-navy-900)]">
                          {u.username}{isSelf && <span className="text-[10px] text-slate-400 ml-1">(Anda)</span>}
                        </td>

                        {editingId === u.id ? (
                          <>
                            <td className="py-2 px-1">
                              <input
                                className="w-full border border-[var(--color-line)] rounded px-1.5 py-1 text-sm"
                                value={editingUser.namaLengkap}
                                onChange={(e) => setEditingUser((v) => ({ ...v, namaLengkap: e.target.value }))}
                              />
                            </td>
                            <td className="py-2 px-1">
                              <select
                                className="w-full border border-[var(--color-line)] rounded px-1.5 py-1 text-sm"
                                value={editingUser.role}
                                onChange={(e) => setEditingUser((v) => ({ ...v, role: e.target.value }))}
                                disabled={isSelf}
                              >
                                <option value="petugas">Petugas</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="py-2 px-1 text-slate-500">{u.aktif ? 'Aktif' : 'Nonaktif'}</td>
                            <td className="py-2 px-1">
                              <div className="flex gap-1.5">
                                <button onClick={() => saveEdit(u.id)}><Check size={15} className="text-[var(--color-vital-600)]" /></button>
                                <button onClick={() => setEditingId(null)}><X size={15} className="text-slate-400" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`py-2 px-1 ${u.aktif ? 'text-[var(--color-navy-900)]' : 'text-slate-400 line-through'}`}>{u.nama_lengkap}</td>
                            <td className="py-2 px-1">
                              <Pill tone={u.role === 'admin' ? 'seal' : 'navy'}>{u.role === 'admin' ? 'Admin' : 'Petugas'}</Pill>
                            </td>
                            <td className="py-2 px-1">
                              <Pill tone={u.aktif ? 'vital' : 'alert'}>{u.aktif ? 'Aktif' : 'Nonaktif'}</Pill>
                            </td>
                            <td className="py-2 px-1">
                              <div className="flex gap-2">
                                <button title="Edit" onClick={() => startEdit(u)}>
                                  <Pencil size={14} className="text-slate-400 hover:text-[var(--color-navy-700)]" />
                                </button>
                                <button title="Reset password" onClick={() => { setResetId(u.id); setResetPassword(''); }}>
                                  <KeyRound size={14} className="text-slate-400 hover:text-[var(--color-navy-700)]" />
                                </button>
                                {!isSelf && (
                                  <button title={u.aktif ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggleAktif(u)}>
                                    {u.aktif
                                      ? <UserX size={14} className="text-slate-400 hover:text-[var(--color-alert-600)]" />
                                      : <UserCheck size={14} className="text-[var(--color-vital-600)]" />}
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-slate-400 py-6">Belum ada user.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal sederhana reset password */}
        {resetId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setResetId(null)}>
            <Card className="p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-3">Reset Password</h3>
              <Input
                type="password"
                placeholder="Password baru (min. 6 karakter)"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 mt-3 justify-end">
                <Button variant="ghost" onClick={() => setResetId(null)}>Batal</Button>
                <Button variant="primary" onClick={() => submitReset(resetId)}>Simpan</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}