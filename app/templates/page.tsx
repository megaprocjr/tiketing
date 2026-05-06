"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileImage, ImagePlus, PencilRuler, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { FileUploader } from "@/components/FileUploader";

type TemplateItem = {
  id: string;
  name: string;
  originalFileName: string;
  filePath: string;
  width: number;
  height: number;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/templates");
    const data = await response.json();
    setTemplates(data.templates ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage("Pilih gambar desain tiket terlebih dahulu.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      const response = await fetch("/api/templates", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({ error: "Server belum mengirim pesan error." }));
      if (!response.ok) {
        setMessage(data.error ?? "Desain belum berhasil diupload.");
        return;
      }
      setFile(null);
      setName("");
      setMessage("Desain tiket berhasil disimpan.");
      await load();
    } catch {
      setMessage("Koneksi upload terputus. Coba lagi atau kecilkan ukuran file.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(template: TemplateItem) {
    const ok = window.confirm(`Hapus desain "${template.name}"? Desain yang sudah dipakai tiket tidak bisa dihapus.`);
    if (!ok) return;
    setMessage("");
    const response = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Desain belum berhasil dihapus.");
      return;
    }
    setMessage("Desain tiket berhasil dihapus.");
    await load();
  }

  return (
    <AppShell>
      <section className="mb-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:mb-6 md:p-6">
        <p className="text-sm font-black uppercase tracking-wide text-violet-700">Desain tiket</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Upload dan Atur Desain</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Simpan gambar tiket buatanmu, lalu tentukan posisi barcode dan nama siswa sebelum tiket dibuat.
            </p>
          </div>
          <div className="w-fit rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-800 md:px-4 md:py-3 md:text-sm">{templates.length} desain tersimpan</div>
        </div>
      </section>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={upload} className="space-y-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
              <ImagePlus size={21} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">Tambah Desain Tiket</h2>
              <p className="mt-1 text-sm text-slate-500">Gunakan file PNG atau JPG yang sudah siap cetak.</p>
            </div>
          </div>
          <label className="block text-sm font-bold text-slate-700">
            Nama desain
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              placeholder="Contoh: Tiket Wisuda SD"
            />
          </label>
          <FileUploader label={file ? file.name : "Pilih gambar tiket"} accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={setFile} />
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            File yang diterima: PNG, JPG, atau JPEG. Maksimal 12 MB dan sisi terpanjang 5000 px.
          </div>
          {message && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
          <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-black text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-60">
            <ImagePlus size={17} />
            {loading ? "Menyimpan..." : "Simpan Desain"}
          </button>
        </form>

        <section>
          <h2 className="mb-3 text-xl font-black text-slate-950">Galeri Desain</h2>
          {templates.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <div key={template.id} className="group overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur transition hover:-translate-y-0.5">
                  <div className="relative bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={template.filePath} alt={template.name} className="h-52 w-full object-contain p-3" />
                    <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                      {template.width} x {template.height}
                    </span>
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{template.name}</h3>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{template.originalFileName}</p>
                      </div>
                      <PencilRuler className="text-violet-700" size={20} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/templates/${template.id}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800">
                        Atur Barcode <ArrowRight size={15} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void deleteTemplate(template)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={15} />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileImage} title="Belum ada desain" description="Upload gambar tiket pertama untuk mulai mengatur barcode." />
          )}
        </section>
      </div>
    </AppShell>
  );
}
