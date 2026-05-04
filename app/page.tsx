import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ClipboardCheck, FileImage, Plus, QrCode, ScanLine, Sparkles, Ticket } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { db } from "@/lib/db";
import { ensureSampleEvent } from "@/lib/seed";

export default async function DashboardPage() {
  await ensureSampleEvent();
  const [events, templates, tickets, checkedIn, batches, latestEvent] = await Promise.all([
    db.event.count(),
    db.ticketTemplate.count(),
    db.ticket.count(),
    db.ticket.count({ where: { status: "CHECKED_IN" } }),
    db.generationBatch.count(),
    db.event.findFirst({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tickets: true, batches: true } } },
    }),
  ]);
  const waitingTickets = Math.max(tickets - checkedIn, 0);
  const checkInRate = tickets ? Math.round((checkedIn / tickets) * 100) : 0;

  const actions = [
    { href: "/events", label: "Buat Event", description: "Isi nama sekolah, tanggal foto, dan kode tiket.", icon: Plus, tone: "blue" },
    { href: "/templates", label: "Upload Desain", description: "Masukkan gambar tiket dan tentukan posisi barcode.", icon: FileImage, tone: "violet" },
    { href: "/generate", label: "Buat Tiket Banyak", description: "Masukkan data siswa, lalu unduh tiket siap cetak.", icon: QrCode, tone: "emerald" },
    { href: "/scanner", label: "Scan Saat Ambil Foto", description: "Cek tiket cepat ketika siswa atau orang tua datang.", icon: ScanLine, tone: "amber" },
  ];

  return (
    <AppShell>
      <section className="relative mb-4 overflow-hidden rounded-2xl border border-white/80 bg-slate-950 px-4 py-5 text-white shadow-2xl shadow-slate-300/70 md:mb-6 md:px-8 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(37,99,235,0.72),transparent_25rem),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.32),transparent_24rem),linear-gradient(135deg,#020617_0%,#0f172a_55%,#172554_100%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative grid gap-4 md:gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-blue-100 ring-1 ring-white/15 backdrop-blur md:text-xs">
              <Sparkles size={14} />
              Siap dipakai saat event
            </p>
            <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight tracking-tight min-[390px]:text-3xl md:mt-5 md:text-5xl">
              School Photo Ticket Studio
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
              Buat tiket foto dari data siswa, pasang barcode di desain tiket, scan saat pembagian, lalu lihat siapa yang sudah ambil foto.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-slate-100 md:mt-6 md:text-xs">
              <span className="rounded-lg bg-white/10 px-2.5 py-2 ring-1 ring-white/15 md:px-3">Data aman di laptop</span>
              <span className="rounded-lg bg-white/10 px-2.5 py-2 ring-1 ring-white/15 md:px-3">Scan QR dan barcode</span>
              <span className="hidden rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15 min-[390px]:inline">File siap dibagikan</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md md:p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-blue-100">Progres pembagian</p>
              <ClipboardCheck size={18} className="text-blue-100" />
            </div>
            <p className="mt-3 text-3xl font-black md:mt-4">{checkInRate}%</p>
            <p className="mt-1 text-sm text-slate-300">tiket sudah discan</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-300" style={{ width: `${checkInRate}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/10 p-2.5 md:p-3">
                <p className="text-slate-300">Belum ambil</p>
                <p className="mt-1 text-lg font-black">{waitingTickets}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2.5 md:p-3">
                <p className="text-slate-300">Sesi buat tiket</p>
                <p className="mt-1 text-lg font-black">{batches}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Event foto" value={events} icon={CalendarDays} accent="blue" />
        <StatCard label="Desain tiket" value={templates} icon={FileImage} accent="violet" />
        <StatCard label="Tiket dibuat" value={tickets} icon={Ticket} accent="amber" />
        <StatCard label="Sudah discan" value={checkedIn} icon={CheckCircle2} accent="emerald" />
      </section>

      <section className="mt-4 grid gap-3 md:mt-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const tones: Record<string, string> = {
            blue: "bg-blue-600 text-white shadow-blue-600/20",
            violet: "bg-violet-600 text-white shadow-violet-600/20",
            emerald: "bg-emerald-600 text-white shadow-emerald-600/20",
            amber: "bg-amber-500 text-white shadow-amber-500/20",
          };
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex min-h-28 items-start justify-between gap-3 rounded-xl border border-white/80 bg-white/85 p-4 text-slate-950 shadow-lg shadow-slate-200/70 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200 md:min-h-32 md:p-5"
            >
              <div>
                <span className={`grid h-10 w-10 place-items-center rounded-xl shadow-lg md:h-11 md:w-11 ${tones[action.tone]}`}>
                  <Icon size={19} />
                </span>
                <h2 className="mt-3 text-sm font-black leading-tight md:mt-4 md:text-base">{action.label}</h2>
                <p className="mt-1 hidden max-w-xs text-sm leading-5 text-slate-500 min-[390px]:line-clamp-2 md:mt-2 md:block">{action.description}</p>
              </div>
              <ArrowRight size={17} className="mt-2 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
            </Link>
          );
        })}
        </div>
        <aside className="rounded-xl border border-white/80 bg-white/85 p-4 shadow-lg shadow-slate-200/70 backdrop-blur md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">Event terakhir</p>
              <p className="mt-1 text-sm text-slate-500">Lanjutkan pekerjaan terakhir.</p>
            </div>
            <Clock3 size={20} className="text-blue-700" />
          </div>
          {latestEvent ? (
            <div className="mt-5">
              <h2 className="text-lg font-black text-slate-950">{latestEvent.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{latestEvent.schoolName}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Kode awal</p>
                  <p className="mt-1 font-black text-slate-950">{latestEvent.codePrefix}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Jumlah tiket</p>
                  <p className="mt-1 font-black text-slate-950">{latestEvent._count.tickets}</p>
                </div>
              </div>
              <Link href={`/events/${latestEvent.id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Buka Event Ini
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Belum ada event.</p>
          )}
        </aside>
      </section>
    </AppShell>
  );
}
