"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, FolderOpen, Pencil, School, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";

type EventItem = {
  id: string;
  name: string;
  schoolName: string;
  codePrefix: string;
  shootDate?: string | null;
  notes?: string | null;
  _count?: { tickets: number; batches: number };
};

const emptyForm = { name: "", schoolName: "", shootDate: "", codePrefix: "SCH-2026", notes: "" };

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/events");
    const data = await response.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(editingId ? `/api/events/${editingId}` : "/api/events", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Event belum berhasil disimpan.");
      return;
    }
    setEditingId(null);
    setForm({ ...emptyForm, codePrefix: form.codePrefix });
    await load();
  }

  function startEdit(item: EventItem) {
    setEditingId(item.id);
    setError("");
    setForm({
      name: item.name,
      schoolName: item.schoolName,
      shootDate: item.shootDate ? item.shootDate.slice(0, 10) : "",
      codePrefix: item.codePrefix,
      notes: item.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
    setForm(emptyForm);
  }

  async function deleteEvent(item: EventItem) {
    const ok = window.confirm(`Hapus event "${item.name}"? Semua tiket di event ini juga ikut terhapus.`);
    if (!ok) return;
    const response = await fetch(`/api/events/${item.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Event belum berhasil dihapus.");
      return;
    }
    if (editingId === item.id) cancelEdit();
    await load();
  }

  return (
    <AppShell>
      <section className="mb-4 overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:mb-6 md:p-6">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">Event foto sekolah</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Atur Event Foto</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Buat jadwal foto, tentukan kode awal tiket, lalu gunakan event ini saat membuat dan scan tiket.
            </p>
          </div>
          <div className="w-fit rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-800 md:px-4 md:py-3 md:text-sm">{events.length} event tersimpan</div>
        </div>
      </section>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <CalendarPlus size={21} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">{editingId ? "Ubah Event" : "Buat Event Baru"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingId ? "Perbarui data event yang sudah dibuat." : "Isi data dasar sebelum tiket dibuat."}
              </p>
            </div>
          </div>

          {[
            ["Nama event", "name"],
            ["Nama sekolah", "schoolName"],
            ["Kode awal tiket", "codePrefix"],
          ].map(([label, key]) => (
            <label key={key} className="block text-sm font-bold text-slate-700">
              {label}
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={form[key as keyof typeof form]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                required
              />
            </label>
          ))}
          <label className="block text-sm font-bold text-slate-700">
            Tanggal foto
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="date"
              value={form.shootDate}
              onChange={(event) => setForm((current) => ({ ...current, shootDate: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Catatan
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
            <CalendarPlus size={17} />
            {editingId ? "Simpan Perubahan" : "Simpan Event"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-black text-slate-800 hover:bg-slate-50"
            >
              <X size={17} />
              Batal Ubah
            </button>
          )}
        </form>

        <section>
          <h2 className="mb-3 text-xl font-black text-slate-950">Daftar Event</h2>
          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-lg shadow-slate-200/70">Memuat event...</div>
          ) : events.length ? (
            <div className="grid gap-3">
              {events.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur transition hover:-translate-y-0.5 md:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white">
                        <School size={19} />
                      </span>
                      <div>
                        <h3 className="font-black text-slate-950">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{item.schoolName}</p>
                      </div>
                    </div>
                    <span className="w-fit rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-800">{item.codePrefix}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold text-slate-500">Tiket dibuat</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{item._count?.tickets ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold text-slate-500">Sesi buat tiket</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{item._count?.batches ?? 0}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/events/${item.id}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800">
                      Buka Event <ArrowRight size={15} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800 hover:bg-slate-50"
                    >
                      <Pencil size={15} />
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteEvent(item)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={15} />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FolderOpen} title="Belum ada event" description="Buat event foto pertama untuk mulai membuat tiket." />
          )}
        </section>
      </div>
    </AppShell>
  );
}
