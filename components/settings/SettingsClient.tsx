"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, DatabaseBackup, Download, Pencil, RotateCcw, Trash2, Upload, UserPlus } from "lucide-react";

type Batch = {
  id: string;
  barcodeType: string;
  totalTickets: number;
  zipPath?: string | null;
  pdfPath?: string | null;
  manifestPath?: string | null;
  createdAt: string;
  event: { name: string; schoolName: string };
  template: { name: string };
  _count: { tickets: number };
};

type UserItem = {
  id: string;
  name: string;
  username: string;
  role: "SUPER_ADMIN" | "ADMIN" | "OPERATOR";
  isActive: boolean;
};

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  OPERATOR: "Operator Scan",
};

export function SettingsClient() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [message, setMessage] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [resetText, setResetText] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    username: "",
    pin: "",
    role: "OPERATOR" as UserItem["role"],
    isActive: true,
  });

  async function loadBatches() {
    const response = await fetch("/api/batches");
    const data = (await response.json()) as { batches?: Batch[] };
    setBatches(data.batches ?? []);
  }

  async function loadUsers() {
    const response = await fetch("/api/users");
    const data = (await response.json()) as { users?: UserItem[] };
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    void loadBatches();
    void loadUsers();
  }, []);

  function resetUserForm() {
    setEditingId(null);
    setUserForm({ name: "", username: "", pin: "", role: "OPERATOR", isActive: true });
  }

  function editUser(user: UserItem) {
    setEditingId(user.id);
    setUserForm({ name: user.name, username: user.username, pin: "", role: user.role, isActive: user.isActive });
  }

  async function saveUser(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(editingId ? "Menyimpan perubahan akun..." : "Membuat akun...");
    const response = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Akun belum berhasil disimpan.");
      return;
    }
    setMessage(editingId ? "Akun berhasil diperbarui." : "Akun berhasil dibuat.");
    resetUserForm();
    await loadUsers();
  }

  async function deleteUser(user: UserItem) {
    const ok = window.confirm(`Hapus akun "${user.username}"?`);
    if (!ok) return;
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Akun belum berhasil dihapus.");
      return;
    }
    setMessage("Akun berhasil dihapus.");
    await loadUsers();
  }

  async function restore() {
    if (!restoreFile) {
      setMessage("Pilih file cadangan dulu.");
      return;
    }
    const ok = window.confirm("Pulihkan cadangan akan menimpa data lokal yang sama. Lanjutkan?");
    if (!ok) return;
    setLoading(true);
    setMessage("Memulihkan cadangan...");
    const formData = new FormData();
    formData.append("file", restoreFile);
    const response = await fetch("/api/admin/restore", { method: "POST", body: formData });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Cadangan belum berhasil dipulihkan.");
      return;
    }
    setMessage(`Cadangan berhasil dipulihkan. ${data.restored} file kembali. Refresh aplikasi sebelum lanjut bekerja.`);
    await loadBatches();
  }

  async function reset() {
    const ok = window.confirm("Reset akan menghapus event, desain, tiket, sesi buat tiket, dan file hasil. Lanjutkan?");
    if (!ok) return;
    setLoading(true);
    setMessage("Menghapus data percobaan...");
    const response = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: resetText }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Data belum berhasil dihapus.");
      return;
    }
    setResetText("");
    setMessage("Data berhasil dibersihkan. Buat event dan desain baru untuk mulai ulang.");
    await loadBatches();
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="text-blue-700" size={20} />
            <h2 className="font-black text-slate-950">Simpan Cadangan</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Unduh satu file cadangan berisi data, desain tiket, dan hasil tiket yang sudah dibuat.</p>
          <a
            href="/api/admin/backup"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
          >
            <Download size={16} />
            Unduh Cadangan
          </a>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-center gap-2">
            <Upload className="text-emerald-700" size={20} />
            <h2 className="font-black text-slate-950">Pulihkan Cadangan</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Pakai file cadangan dari aplikasi ini. Cocok untuk pindah laptop atau operator.</p>
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)}
            className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void restore()}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Upload size={16} />
            Pulihkan
          </button>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-xl shadow-red-100/70 md:p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-700" size={20} />
            <h2 className="font-black text-red-950">Bersihkan Data Percobaan</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-red-800">Hapus semua event, desain, tiket, sesi buat tiket, dan file hasil.</p>
          <input
            value={resetText}
            onChange={(event) => setResetText(event.target.value)}
            placeholder="Ketik RESET"
            className="mt-4 w-full rounded-xl border border-red-200 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void reset()}
            disabled={loading || resetText !== "RESET"}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Bersihkan
          </button>
        </div>
      </section>

      {message && <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>}

      <section className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={saveUser} className="space-y-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="text-blue-700" size={20} />
            <h2 className="font-black text-slate-950">{editingId ? "Ubah Akun" : "Tambah Akun"}</h2>
          </div>
          <label className="block text-sm font-bold text-slate-700">
            Nama
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Username
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={userForm.username} onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            PIN {editingId ? "(kosongkan jika tidak diganti)" : ""}
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" type="password" value={userForm.pin} onChange={(event) => setUserForm((current) => ({ ...current, pin: event.target.value }))} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Hak akses
            <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as UserItem["role"] }))}>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="OPERATOR">Operator Scan</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={userForm.isActive} onChange={(event) => setUserForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Aktif
          </label>
          <div className="flex gap-2">
            <button disabled={loading} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
              {editingId ? "Simpan" : "Tambah"}
            </button>
            {editingId && (
              <button type="button" onClick={resetUserForm} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-800">
                Batal
              </button>
            )}
          </div>
        </form>

        <section className="rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-black text-slate-950">Daftar Akun</h2>
            <p className="mt-1 text-sm text-slate-500">Atur akun Super Admin, Admin, dan Operator Scan.</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Nama</th>
                  <th className="px-3 py-3">Username</th>
                  <th className="px-3 py-3">Hak akses</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-semibold">{user.name}</td>
                    <td className="px-3 py-3">{user.username}</td>
                    <td className="px-3 py-3">{roleLabels[user.role]}</td>
                    <td className="px-3 py-3">{user.isActive ? "Aktif" : "Nonaktif"}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editUser(user)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-black">
                          <Pencil size={13} /> Ubah
                        </button>
                        <button type="button" onClick={() => void deleteUser(user)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-black text-slate-950">Riwayat Tiket yang Dibuat</h2>
          <p className="mt-1 text-sm text-slate-500">Unduh ulang gambar, PDF, atau daftar tiket tanpa membuat ulang.</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Tanggal</th>
                <th className="px-3 py-3">Event</th>
                <th className="px-3 py-3">Desain</th>
                <th className="px-3 py-3">Tiket</th>
                <th className="px-3 py-3">Jenis scan</th>
                <th className="px-3 py-3">Unduh</th>
              </tr>
            </thead>
            <tbody>
              {batches.length ? (
                batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">{new Date(batch.createdAt).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-3">{batch.event.name}</td>
                    <td className="px-3 py-3">{batch.template.name}</td>
                    <td className="px-3 py-3">{batch._count.tickets || batch.totalTickets}</td>
                    <td className="px-3 py-3">{batch.barcodeType}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white" href={`/api/batches/${batch.id}/download/zip`}>Gambar</a>
                        <a className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white" href={`/api/batches/${batch.id}/download/pdf`}>PDF</a>
                        <a className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white" href={`/api/batches/${batch.id}/download/csv`}>Daftar</a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Belum ada tiket yang dibuat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
