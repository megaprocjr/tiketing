"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, LoaderCircle, QrCode, ShieldCheck, Sparkles, UploadCloud, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BarcodeTypeSelector } from "@/components/BarcodeTypeSelector";
import { BatchResultCard } from "@/components/BatchResultCard";
import { CsvPreviewTable } from "@/components/CsvPreviewTable";
import { FileUploader } from "@/components/FileUploader";
import { validateCsvRows, type CsvStudentRow } from "@/lib/csv";
import type { BarcodeType } from "@/lib/validations";

type Option = { id: string; name: string; schoolName?: string; filePath?: string };
type GeneratedTicket = { id: string; ticketCode: string; studentName: string; className: string; generatedImagePath?: string | null };
type BatchResult = {
  totalTickets: number;
  zipPath?: string | null;
  pdfPath?: string | null;
  manifestPath?: string | null;
  tickets?: GeneratedTicket[];
  skippedRows?: number;
  batches?: {
    totalTickets: number;
    zipPath?: string | null;
    pdfPath?: string | null;
    manifestPath?: string | null;
  }[];
};
type ExistingTicket = {
  id: string;
  ticketCode: string;
  studentName: string;
  className: string;
  studentId?: string | null;
  status: string;
};

function rowKey(row: Pick<CsvStudentRow, "student_name" | "class_name" | "student_id">) {
  const studentId = row.student_id?.trim().toLowerCase();
  const className = row.class_name.trim().toLowerCase();
  return studentId ? `id:${studentId}|class:${className}` : `name:${row.student_name.trim().toLowerCase()}|class:${className}`;
}

function ticketKey(ticket: Pick<ExistingTicket, "studentName" | "className" | "studentId">) {
  const studentId = ticket.studentId?.trim().toLowerCase();
  const className = ticket.className.trim().toLowerCase();
  return studentId ? `id:${studentId}|class:${className}` : `name:${ticket.studentName.trim().toLowerCase()}|class:${className}`;
}

function progressText(progress: number) {
  if (progress < 25) return "Menyiapkan data siswa dan desain tiket...";
  if (progress < 55) return "Membuat barcode dan gambar tiket satu per satu...";
  if (progress < 82) return "Merapikan file gambar, PDF, dan daftar tiket...";
  return "Hampir selesai. Menunggu server mengirim hasil...";
}

const onlineChunkSize = 80;

function chunkRows(rowsToChunk: CsvStudentRow[]) {
  const chunks: CsvStudentRow[][] = [];
  for (let index = 0; index < rowsToChunk.length; index += onlineChunkSize) {
    chunks.push(rowsToChunk.slice(index, index + onlineChunkSize));
  }
  return chunks;
}

export default function GeneratePage() {
  const [events, setEvents] = useState<Option[]>([]);
  const [templates, setTemplates] = useState<Option[]>([]);
  const [eventId, setEventId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [barcodeType, setBarcodeType] = useState<BarcodeType>("qrcode");
  const [rows, setRows] = useState<CsvStudentRow[]>([]);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [existingTickets, setExistingTickets] = useState<ExistingTicket[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  useEffect(() => {
    async function load() {
      const [eventsResponse, templatesResponse] = await Promise.all([fetch("/api/events"), fetch("/api/templates")]);
      const eventsData = await eventsResponse.json();
      const templatesData = await templatesResponse.json();
      setEvents(eventsData.events ?? []);
      setTemplates(templatesData.templates ?? []);
      setEventId(eventsData.events?.[0]?.id ?? "");
      setTemplateId(templatesData.templates?.[0]?.id ?? "");
    }
    void load();
  }, []);

  useEffect(() => {
    async function loadExistingTickets() {
      if (!eventId) {
        setExistingTickets([]);
        return;
      }
      const response = await fetch(`/api/tickets?eventId=${encodeURIComponent(eventId)}`);
      const data = (await response.json()) as { tickets?: ExistingTicket[] };
      setExistingTickets(data.tickets ?? []);
    }

    void loadExistingTickets();
  }, [eventId, batch]);

  const duplicateInCsv = useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = rowKey(row);
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
  }, [rows]);

  const duplicateExisting = useMemo(() => {
    const ticketsByKey = new Map(existingTickets.map((ticket) => [ticketKey(ticket), ticket]));
    return rows
      .map((row) => {
        const ticket = ticketsByKey.get(rowKey(row));
        return ticket ? { row, ticket } : null;
      })
      .filter((item): item is { row: CsvStudentRow; ticket: ExistingTicket } => Boolean(item));
  }, [existingTickets, rows]);

  const hasDuplicates = duplicateInCsv.length > 0 || duplicateExisting.length > 0;
  const selectedEvent = events.find((event) => event.id === eventId);
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const readySteps = [
    { label: "Event", done: Boolean(eventId), value: selectedEvent?.name ?? "Belum dipilih" },
    { label: "Desain", done: Boolean(templateId), value: selectedTemplate?.name ?? "Belum dipilih" },
    { label: "Data siswa", done: rows.length > 0 && errors.length === 0, value: rows.length ? `${rows.length} siswa` : "Menunggu CSV" },
    { label: "Keamanan", done: !hasDuplicates || skipDuplicates, value: hasDuplicates ? (skipDuplicates ? "Dobel dilewati" : "Perlu dicek") : "Aman" },
  ];

  const canGenerate = useMemo(
    () => eventId && templateId && rows.length > 0 && errors.length === 0 && !loading && (!hasDuplicates || skipDuplicates),
    [eventId, templateId, rows, errors, loading, hasDuplicates, skipDuplicates],
  );

  useEffect(() => {
    if (!loading) return;

    const timer = window.setInterval(() => {
      setGenerateProgress((current) => {
        if (current < 28) return Math.min(current + 4, 28);
        if (current < 62) return Math.min(current + 2.4, 62);
        if (current < 86) return Math.min(current + 1.2, 86);
        return Math.min(current + 0.4, 94);
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function parseFile(file: File | null) {
    setRows([]);
    setErrors([]);
    setBatch(null);
    setMessage("");
    if (!file) return;
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });
    const result = validateCsvRows(parsed.data);
    setRows(result.rows);
    setErrors([
      ...parsed.errors.map((error) => ({ row: error.row ? error.row + 1 : 0, message: error.message })),
      ...result.errors,
    ]);
  }

  async function generate() {
    setLoading(true);
    setGenerateProgress(6);
    const chunks = chunkRows(rows);
    setMessage(
      chunks.length > 1
        ? `Membuat ${rows.length} tiket dalam ${chunks.length} bagian agar proses online tetap stabil...`
        : "Membuat tiket HD, ZIP, PDF, dan daftar unduhan...",
    );
    setBatch(null);
    try {
      const generatedBatches: NonNullable<BatchResult["batches"]> = [];
      const generatedTickets: GeneratedTicket[] = [];
      let totalTickets = 0;
      let skippedRows = 0;

      for (const [chunkIndex, chunk] of chunks.entries()) {
        setMessage(
          chunks.length > 1
            ? `Membuat bagian ${chunkIndex + 1} dari ${chunks.length} (${chunk.length} siswa)...`
            : "Membuat tiket HD, ZIP, PDF, dan daftar unduhan...",
        );
        setGenerateProgress(Math.max(8, Math.round((chunkIndex / chunks.length) * 92)));

        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 70_000);
        const response = await fetch("/api/generate/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, templateId, barcodeType, rows: chunk, duplicateMode: skipDuplicates ? "skip" : "block" }),
          signal: controller.signal,
        });
        window.clearTimeout(timer);
        const data = await response.json().catch(() => ({ error: "Server tidak mengirim pesan. Kemungkinan proses terlalu lama." }));
        if (!response.ok) {
          throw new Error(data.error ?? "Tiket belum berhasil dibuat.");
        }

        generatedBatches.push(data.batch);
        generatedTickets.push(...(data.tickets ?? []));
        totalTickets += data.batch?.totalTickets ?? 0;
        skippedRows += data.skippedRows ?? 0;
      }

      setGenerateProgress(100);
      setBatch({
        totalTickets,
        tickets: generatedTickets,
        skippedRows,
        batches: generatedBatches,
        ...(generatedBatches.length === 1 ? generatedBatches[0] : {}),
      });
      setMessage(
        skippedRows
          ? `Tiket berhasil dibuat. ${skippedRows} data yang sama dilewati.`
          : generatedBatches.length > 1
            ? `Tiket berhasil dibuat dalam ${generatedBatches.length} bagian.`
            : "Tiket berhasil dibuat.",
      );
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Salah satu bagian terlalu lama diproses. Coba ulangi, data yang sudah punya tiket bisa dilewati otomatis."
          : error instanceof Error
            ? error.message
            : "Koneksi generate terputus. Coba lagi sebentar lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="relative mb-4 overflow-hidden rounded-[1.35rem] border border-white/80 bg-slate-950 p-4 text-white shadow-2xl shadow-slate-300/70 md:mb-6 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.38),transparent_24rem),radial-gradient(circle_at_86%_10%,rgba(37,99,235,0.36),transparent_28rem),linear-gradient(135deg,#020617_0%,#0f172a_55%,#064e3b_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-100 ring-1 ring-white/15">
              <Sparkles size={14} />
              Ticket production
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
              Produksi tiket siap cetak dalam satu alur.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
              Pilih event, pasangkan desain, validasi data siswa, lalu hasilkan tiket HD lengkap dengan file unduhan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-emerald-100">Data masuk</p>
              <p className="mt-1 text-2xl font-black">{rows.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-emerald-100">Status</p>
              <p className="mt-1 text-sm font-black">{errors.length ? "Perlu koreksi" : hasDuplicates && !skipDuplicates ? "Cek dobel" : "Siap"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[410px_minmax(0,1fr)]">
        <section className="space-y-4 rounded-[1.35rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Setup produksi</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Siapkan tiket</h2>
              <p className="mt-1 text-sm text-slate-500">Empat langkah pendek sebelum file dibuat.</p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <UploadCloud size={20} />
            </span>
          </div>
          <label className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-bold text-slate-700">
            <span className="flex items-center justify-between">
              <span>Event foto</span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">01</span>
            </span>
            <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name} - {event.schoolName}</option>
              ))}
            </select>
          </label>
          <label className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-bold text-slate-700">
            <span className="flex items-center justify-between">
              <span>Desain tiket</span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">02</span>
            </span>
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Jenis kode scan</span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">03</span>
            </div>
            <BarcodeTypeSelector value={barcodeType} onChange={setBarcodeType} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Data siswa</span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">04</span>
            </div>
            <FileUploader label="Pilih file data siswa" accept=".csv,text/csv" onChange={(file) => void parseFile(file)} />
            <a href="/samples/students.csv" download className="mt-3 inline-flex items-center gap-2 text-sm font-black text-blue-700">
              <FileText size={15} />
              Unduh contoh data siswa
            </a>
          </div>
          {hasDuplicates && (
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-5 text-amber-900">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(event) => setSkipDuplicates(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-amber-300"
              />
              <span>
                <span className="block font-black">Lewati data yang sudah ada</span>
                Tiket baru tetap dibuat untuk siswa lain. Data yang sama tidak akan dibuat lagi.
              </span>
            </label>
          )}
          <button
            disabled={!canGenerate}
            onClick={generate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 font-black text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-45"
          >
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Wand2 size={17} />}
            {loading ? "Membuat tiket..." : "Buat dan Unduh Tiket"}
          </button>
          {loading && (
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-950 shadow-inner shadow-blue-100/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                    <LoaderCircle size={16} className="animate-spin" />
                  </span>
                  <div>
                    <p className="font-black">Sedang membuat tiket</p>
                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      {rows.length > onlineChunkSize
                        ? `Memproses otomatis per bagian. ${progressText(generateProgress)}`
                        : progressText(generateProgress)}
                    </p>
                  </div>
                </div>
                <p className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700 shadow-sm">
                  {Math.round(generateProgress)}%
                </p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${generateProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-blue-800">Jangan tutup halaman ini sampai hasil unduhan muncul.</p>
            </div>
          )}
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            Data besar akan diproses otomatis per bagian. Data yang sudah punya tiket tetap ditahan agar nomor tidak dobel.
          </p>
          {message && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-[1.35rem] border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Production review</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Ringkasan sebelum export</h2>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <QrCode size={19} />
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {readySteps.map((step) => (
                  <div key={step.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase text-slate-500">{step.label}</p>
                      <span className={`h-2.5 w-2.5 rounded-full ${step.done ? "bg-emerald-500" : "bg-slate-300"}`} />
                    </div>
                    <p className="mt-2 truncate text-sm font-black text-slate-950">{step.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-emerald-100 bg-emerald-50 p-4 shadow-xl shadow-emerald-100/60">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck size={18} />
                <p className="font-black">Siap untuk event</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-900">
                QR Code paling stabil untuk kamera HP. Barcode garis cocok kalau desain tiket butuh kode memanjang.
              </p>
            </div>
          </div>
          {batch && <BatchResultCard batch={batch} tickets={batch.tickets ?? []} skippedRows={batch.skippedRows ?? 0} />}
          {hasDuplicates && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg shadow-amber-100/70">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <div>
                  <h3 className="font-black">Ada data yang sama, tiket belum bisa dibuat</h3>
                  <p className="mt-1 leading-6">
                    Supaya tiket tidak dobel, hapus tiket lama di menu Scan Tiket, pakai event baru, atau aktifkan pilihan lewati data yang sudah ada.
                  </p>
                </div>
              </div>
              {skipDuplicates && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                  <p className="font-bold">Mode aman aktif. Data yang sama akan dilewati saat tombol buat tiket ditekan.</p>
                </div>
              )}
              {duplicateExisting.length > 0 && (
                <div className="mt-3 rounded-xl bg-white/70 p-3">
                  <p className="font-black">Sudah ada di event ini:</p>
                  <ul className="mt-2 space-y-1">
                    {duplicateExisting.slice(0, 8).map(({ row, ticket }) => (
                      <li key={`${ticket.id}-${row.student_name}`}>
                        {row.student_name} ({row.class_name}
                        {row.student_id ? `, nomor ${row.student_id}` : ""}) sudah punya tiket {ticket.ticketCode} - {ticket.status}
                      </li>
                    ))}
                  </ul>
                  {duplicateExisting.length > 8 && <p className="mt-2">Dan {duplicateExisting.length - 8} data lainnya.</p>}
                </div>
              )}
              {duplicateInCsv.length > 0 && (
                <div className="mt-3 rounded-xl bg-white/70 p-3">
                  <p className="font-black">Data dobel di file:</p>
                  <ul className="mt-2 space-y-1">
                    {duplicateInCsv.slice(0, 8).map((row, index) => (
                      <li key={`${row.student_name}-${row.class_name}-${index}`}>
                        {row.student_name} ({row.class_name}
                        {row.student_id ? `, nomor ${row.student_id}` : ""})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <CsvPreviewTable rows={rows} errors={errors} />
          {!rows.length && !errors.length && (
            <div className="relative overflow-hidden rounded-[1.35rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-lg shadow-slate-200/60">
              <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
              <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm">
                <Sparkles size={24} />
              </div>
              <p className="relative mt-4 font-black text-slate-950">Menunggu data siswa</p>
              <p className="relative mx-auto mt-2 max-w-md leading-6">Upload file CSV untuk membuka preview, pengecekan dobel, dan tombol export tiket.</p>
              <div className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                Mulai dari panel kiri
                <ChevronRight size={14} />
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
