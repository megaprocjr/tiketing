"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Ban, Camera, Clock3, Download, Play, RefreshCw, Search, Square, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { BarcodeType } from "@/lib/validations";

type CameraDevice = { id: string; label: string };
type ScanResult = {
  status: string;
  message?: string;
  ticket?: {
    id: string;
    ticketCode: string;
    studentName: string;
    className: string;
    packageName?: string | null;
    checkInAt?: string | null;
    event?: { id: string; name: string; schoolName: string };
  };
};

type EventItem = {
  id: string;
  name: string;
  schoolName: string;
};

type TicketItem = {
  id: string;
  ticketCode: string;
  studentName: string;
  className: string;
  studentId?: string | null;
  packageName?: string | null;
  parentName?: string | null;
  phone?: string | null;
  notes?: string | null;
  status: string;
  checkInAt?: string | null;
  createdAt: string;
  event?: EventItem;
};

const scanModes: { value: BarcodeType; label: string; helper: string }[] = [
  { value: "qrcode", label: "QR Code", helper: "Area scan kotak, paling stabil untuk kamera." },
  { value: "code128", label: "Barcode garis", helper: "Area scan melebar untuk barcode garis." },
  { value: "pdf417", label: "Barcode bertumpuk", helper: "Area scan melebar dan lebih tinggi." },
];

const formatByMode: Record<BarcodeType, Html5QrcodeSupportedFormats[]> = {
  qrcode: [Html5QrcodeSupportedFormats.QR_CODE],
  code128: [Html5QrcodeSupportedFormats.CODE_128],
  pdf417: [Html5QrcodeSupportedFormats.PDF_417],
};

export function ScannerPanel() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(0);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [running, setRunning] = useState(false);
  const [scanMode, setScanMode] = useState<BarcodeType>("qrcode");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        setCameraId(devices[0]?.id ?? "");
      })
      .catch(() => setError("Kamera belum tersedia. Pastikan izin kamera diberikan dan gunakan localhost/HTTPS."));

    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setCurrentUserRole(data.user?.role ?? ""))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    async function loadEvents() {
      const response = await fetch("/api/events");
      const data = (await response.json()) as { events?: EventItem[] };
      const loadedEvents = data.events ?? [];
      setEvents(loadedEvents);
      setSelectedEventId((current) => current || loadedEvents[0]?.id || "");
    }

    void loadEvents();
  }, []);

  useEffect(() => {
    void loadTickets();
    const interval = window.setInterval(() => void loadTickets(false), 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const statusOk = statusFilter === "ALL" || ticket.status === statusFilter;
      const queryOk =
        !query ||
        [
          ticket.ticketCode,
          ticket.studentName,
          ticket.className,
          ticket.studentId,
          ticket.phone,
          ticket.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return statusOk && queryOk;
    });
  }, [tickets, statusFilter, search]);

  const summary = useMemo(
    () => ({
      total: tickets.length,
      checkedIn: tickets.filter((ticket) => ticket.status === "CHECKED_IN").length,
      unused: tickets.filter((ticket) => ticket.status === "UNUSED").length,
      cancelled: tickets.filter((ticket) => ticket.status === "CANCELLED").length,
    }),
    [tickets],
  );
  const recentScans = useMemo(
    () =>
      tickets
        .filter((ticket) => ticket.checkInAt)
        .sort((a, b) => Number(new Date(b.checkInAt ?? 0)) - Number(new Date(a.checkInAt ?? 0)))
        .slice(0, 6),
    [tickets],
  );
  const canManageTickets = currentUserRole === "SUPER_ADMIN" || currentUserRole === "ADMIN";

  async function loadTickets(showLoading = true) {
    if (showLoading) setTableLoading(true);
    const query = selectedEventId ? `?eventId=${encodeURIComponent(selectedEventId)}` : "";
    const response = await fetch(`/api/tickets${query}`);
    const data = (await response.json()) as { tickets?: TicketItem[] };
    setTickets(data.tickets ?? []);
    if (showLoading) setTableLoading(false);
  }

  function csvCell(value: string | number | null | undefined) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportStatusCsv() {
    const rows = [
      [
        "ticket_code",
        "status",
        "check_in_at",
        "student_name",
        "class_name",
        "student_id",
        "phone",
        "notes",
        "event",
      ],
      ...filteredTickets.map((ticket) => [
        ticket.ticketCode,
        ticket.status,
        ticket.checkInAt ? new Date(ticket.checkInAt).toLocaleString("id-ID") : "",
        ticket.studentName,
        ticket.className,
        ticket.studentId ?? "",
        ticket.phone ?? "",
        ticket.notes ?? "",
        ticket.event?.name ?? "",
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `status-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function cancelTicket(ticket: TicketItem) {
    const ok = window.confirm(`Batalkan tiket ${ticket.ticketCode} milik ${ticket.studentName}?`);
    if (!ok) return;
    const response = await fetch(`/api/tickets/${ticket.id}/cancel`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal membatalkan tiket.");
      return;
    }
    await loadTickets(false);
  }

  async function deleteTicket(ticket: TicketItem) {
    const ok = window.confirm(`Hapus tiket ${ticket.ticketCode} milik ${ticket.studentName}? Data tiket akan hilang dari daftar scan.`);
    if (!ok) return;
    const response = await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal menghapus tiket.");
      return;
    }
    await loadTickets(false);
  }

  async function resetTicket(ticket: Pick<TicketItem, "id" | "ticketCode" | "studentName">) {
    const ok = window.confirm(`Kembalikan tiket ${ticket.ticketCode} milik ${ticket.studentName} ke status belum ambil?`);
    if (!ok) return;
    const response = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "UNUSED" }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Gagal mengembalikan status tiket.");
      return;
    }
    setResult((current) =>
      current?.ticket?.id === ticket.id
        ? { status: "UNUSED", message: "Status tiket dikembalikan ke belum ambil.", ticket: { ...current.ticket, checkInAt: null } }
        : current,
    );
    await loadTickets(false);
  }

  function beep(ok: boolean) {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, 120);
  }

  async function checkIn(ticketCode: string) {
    if (Date.now() < cooldownRef.current) return;
    cooldownRef.current = Date.now() + 2000;
    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketCode }),
    });
    const data = (await response.json()) as ScanResult;
    setResult(data);
    beep(data.status === "VALID");
    await loadTickets(false);
  }

  async function start() {
    setError("");
    if (!cameraId) {
      setError("Pilih kamera terlebih dahulu.");
      return;
    }
    const scanner = new Html5Qrcode("scanner-reader", {
      formatsToSupport: formatByMode[scanMode],
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });
    scannerRef.current = scanner;
    await scanner.start(
      cameraId,
      {
        fps: 12,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
          width: Math.floor(viewfinderWidth * (scanMode === "qrcode" ? 0.58 : 0.86)),
          height: Math.floor(
            scanMode === "qrcode"
              ? Math.min(viewfinderWidth * 0.58, viewfinderHeight * 0.72)
              : Math.min(viewfinderHeight * (scanMode === "pdf417" ? 0.42 : 0.28), 260),
          ),
        }),
      },
      (decodedText) => void checkIn(decodedText.trim()),
      () => undefined,
    );
    setRunning(true);
  }

  async function stop() {
    await scannerRef.current?.stop();
    scannerRef.current = null;
    setRunning(false);
  }

  return (
    <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">
              Kamera
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                value={cameraId}
                onChange={(event) => setCameraId(event.target.value)}
                disabled={running}
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Kamera ${camera.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Mode scan
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                value={scanMode}
                onChange={(event) => setScanMode(event.target.value as BarcodeType)}
                disabled={running}
              >
                {scanModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={start}
              disabled={running}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <Play size={16} />
              Start Scan
            </button>
            <button
              type="button"
              onClick={stop}
              disabled={!running}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 disabled:opacity-50"
            >
              <Square size={16} />
              Stop
            </button>
          </div>
        </div>
        <p className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
          {scanModes.find((mode) => mode.value === scanMode)?.helper}
        </p>
        <div id="scanner-reader" className="min-h-[300px] overflow-hidden rounded-2xl bg-slate-950 shadow-inner md:min-h-[360px]" />
        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      <aside className="space-y-4">
      <div className="space-y-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <Camera size={18} />
            Hasil Scan
          </h2>
          <p className="mt-1 text-sm text-slate-500">Setelah terbaca, kamera jeda 2 detik agar tidak masuk dua kali.</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            QR paling mudah terbaca. Untuk barcode garis, usahakan gambar terang, sejajar, dan memenuhi area scan.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Masukkan kode tiket"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
          <button onClick={() => void checkIn(manualCode)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
            Cek
          </button>
        </div>
        {result ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <StatusBadge status={result.status} />
            {result.ticket ? (
              <>
                <dl className="mt-4 space-y-2 text-sm">
                  <div><dt className="font-bold text-slate-500">Kode</dt><dd>{result.ticket.ticketCode}</dd></div>
                  <div><dt className="font-bold text-slate-500">Siswa</dt><dd>{result.ticket.studentName}</dd></div>
                  <div><dt className="font-bold text-slate-500">Kelas</dt><dd>{result.ticket.className}</dd></div>
                  <div><dt className="font-bold text-slate-500">Event</dt><dd>{result.ticket.event?.name}</dd></div>
                  <div><dt className="font-bold text-slate-500">Waktu scan</dt><dd>{result.ticket.checkInAt ? new Date(result.ticket.checkInAt).toLocaleString("id-ID") : "-"}</dd></div>
                </dl>
                {canManageTickets && result.ticket.checkInAt && (
                  <button
                    type="button"
                    onClick={() => void resetTicket(result.ticket!)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-black text-amber-700 hover:bg-amber-100"
                  >
                    <RefreshCw size={15} />
                    Salah scan, kembalikan
                  </button>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-700">{result.message ?? "Tiket tidak dikenal."}</p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Belum ada kode yang terbaca.</div>
        )}
      </div>
      <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950">Scan terakhir</h2>
            <p className="mt-1 text-sm text-slate-500">Siswa yang baru saja tercatat.</p>
          </div>
          <Clock3 size={19} className="text-amber-600" />
        </div>
        <div className="mt-4 space-y-2">
          {recentScans.length ? (
            recentScans.map((ticket) => (
              <div key={ticket.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{ticket.studentName}</p>
                    <p className="mt-1 text-xs text-slate-500">{ticket.className}</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{ticket.checkInAt ? new Date(ticket.checkInAt).toLocaleString("id-ID") : "-"}</p>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada scan di event ini.</p>
          )}
        </div>
      </div>
      </aside>

      <section className="rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur lg:col-span-2">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Daftar Siswa dan Status Ambil Foto</h2>
              <p className="mt-1 text-sm text-slate-500">Pantau siapa yang sudah discan, belum datang, atau dibatalkan.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadTickets()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                <RefreshCw size={15} />
                Muat Ulang
              </button>
              <button
                type="button"
                onClick={exportStatusCsv}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800"
              >
                <Download size={15} />
                Unduh Daftar
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Total tiket</p><p className="text-xl font-black">{summary.total}</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Sudah discan</p><p className="text-xl font-black text-emerald-800">{summary.checkedIn}</p></div>
            <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-700">Belum ambil</p><p className="text-xl font-black text-blue-800">{summary.unused}</p></div>
            <div className="rounded-xl bg-red-50 p-3"><p className="text-xs text-red-700">Dibatalkan</p><p className="text-xl font-black text-red-800">{summary.cancelled}</p></div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_1fr]">
            <label className="text-xs font-bold text-slate-500">
              Event
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              >
                <option value="">Semua event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {event.schoolName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              >
                <option value="ALL">Semua</option>
                <option value="CHECKED_IN">Sudah discan</option>
                <option value="UNUSED">Belum ambil</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Cari siswa atau kode tiket
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-100">
                <Search size={15} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 text-sm font-normal text-slate-900 outline-none"
                  placeholder="Nama, kelas, kode..."
                />
              </div>
            </label>
          </div>
        </div>

        <div className="block divide-y divide-slate-100 md:hidden">
          {tableLoading ? (
            <p className="px-4 py-8 text-center text-slate-500">Memuat daftar siswa...</p>
          ) : filteredTickets.length ? (
            filteredTickets.map((ticket) => (
              <article key={ticket.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950">{ticket.studentName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticket.className}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Kode tiket</p>
                    <p className="mt-1 break-all font-mono">{ticket.ticketCode}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Waktu scan</p>
                    <p className="mt-1">{ticket.checkInAt ? new Date(ticket.checkInAt).toLocaleString("id-ID") : "-"}</p>
                  </div>
                </div>
                {(ticket.phone || ticket.notes) && (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {[ticket.phone, ticket.notes].filter(Boolean).join(" - ")}
                  </p>
                )}
                {canManageTickets && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={ticket.status !== "CHECKED_IN"}
                      onClick={() => void resetTicket(ticket)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-black text-slate-700 disabled:opacity-45"
                    >
                      Kembalikan
                    </button>
                    <button
                      type="button"
                      disabled={ticket.status === "CANCELLED"}
                      onClick={() => void cancelTicket(ticket)}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-xs font-black text-amber-700 disabled:opacity-45"
                    >
                      Batalkan
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteTicket(ticket)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-black text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-slate-500">Belum ada data sesuai pilihan.</p>
          )}
        </div>

        <div className="hidden overflow-auto md:block">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Nama</th>
                <th className="px-3 py-3">Kelas</th>
                <th className="px-3 py-3">Nomor siswa</th>
                <th className="px-3 py-3">Telepon</th>
                <th className="px-3 py-3">Catatan</th>
                <th className="px-3 py-3">Waktu discan</th>
                <th className="px-3 py-3">Kode tiket</th>
                {canManageTickets && <th className="px-3 py-3">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr><td colSpan={canManageTickets ? 9 : 8} className="px-3 py-8 text-center text-slate-500">Memuat daftar siswa...</td></tr>
              ) : filteredTickets.length ? (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-100">
                    <td className="px-3 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="px-3 py-3 font-semibold text-slate-950">{ticket.studentName}</td>
                    <td className="px-3 py-3">{ticket.className}</td>
                    <td className="px-3 py-3">{ticket.studentId || "-"}</td>
                    <td className="px-3 py-3">{ticket.phone || "-"}</td>
                    <td className="px-3 py-3">{ticket.notes || "-"}</td>
                    <td className="px-3 py-3">{ticket.checkInAt ? new Date(ticket.checkInAt).toLocaleString("id-ID") : "-"}</td>
                    <td className="px-3 py-3 font-mono text-xs">{ticket.ticketCode}</td>
                    {canManageTickets && (
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={ticket.status !== "CHECKED_IN"}
                            onClick={() => void resetTicket(ticket)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <RefreshCw size={13} />
                            Kembalikan
                          </button>
                          <button
                            type="button"
                            disabled={ticket.status === "CANCELLED"}
                            onClick={() => void cancelTicket(ticket)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          >
                            <Ban size={13} />
                            Batalkan
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteTicket(ticket)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={13} />
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={canManageTickets ? 9 : 8} className="px-3 py-8 text-center text-slate-500">Belum ada data sesuai pilihan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
