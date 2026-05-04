"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileText, Sparkles, UploadCloud, Wand2 } from "lucide-react";
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

  const canGenerate = useMemo(
    () => eventId && templateId && rows.length > 0 && errors.length === 0 && !loading && (!hasDuplicates || skipDuplicates),
    [eventId, templateId, rows, errors, loading, hasDuplicates, skipDuplicates],
  );

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
    setMessage("Membuat tiket HD, ZIP, PDF, dan manifest...");
    setBatch(null);
    const response = await fetch("/api/generate/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, templateId, barcodeType, rows, duplicateMode: skipDuplicates ? "skip" : "block" }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Tiket belum berhasil dibuat.");
      return;
    }
    setBatch({ ...data.batch, tickets: data.tickets ?? [], skippedRows: data.skippedRows ?? 0 });
    setMessage(data.skippedRows ? `Tiket berhasil dibuat. ${data.skippedRows} data yang sama dilewati.` : "Tiket berhasil dibuat.");
  }

  return (
    <AppShell>
      <section className="mb-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:mb-6 md:p-6">
        <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Buat tiket banyak</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Buat Tiket dari Data Siswa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Pilih event dan desain, masukkan data siswa, lalu unduh tiket siap cetak dan siap dibagikan.
            </p>
          </div>
          <div className="w-fit rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 md:px-4 md:py-3 md:text-sm">{rows.length} siswa siap dicek</div>
        </div>
      </section>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="space-y-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <UploadCloud size={21} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">Langkah Buat Tiket</h2>
              <p className="mt-1 text-sm text-slate-500">Ikuti urutan ini agar tiket tidak tertukar.</p>
            </div>
          </div>
          <label className="block text-sm font-bold text-slate-700">
            1. Pilih event
            <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name} - {event.schoolName}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            2. Pilih desain tiket
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>
          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">3. Pilih jenis kode scan</p>
            <BarcodeTypeSelector value={barcodeType} onChange={setBarcodeType} />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">4. Masukkan data siswa</p>
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
          >
            <Wand2 size={17} />
            {loading ? "Membuat tiket..." : "Buat dan Unduh Tiket"}
          </button>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            Sistem akan menolak data siswa yang sudah punya tiket di event yang sama agar tidak dobel.
          </p>
          {message && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
        </section>

        <section className="space-y-4">
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
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-lg shadow-slate-200/60">
              <Sparkles className="mx-auto mb-3 text-emerald-600" size={24} />
              Pilih file data siswa untuk melihat daftar sebelum tiket dibuat.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
