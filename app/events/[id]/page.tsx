import Link from "next/link";
import { CalendarDays, CheckCircle2, Download, QrCode, School, Ticket, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { db } from "@/lib/db";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      tickets: { orderBy: { createdAt: "desc" } },
      batches: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  if (!event) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/70">Event tidak ditemukan.</div>
      </AppShell>
    );
  }

  const total = event.tickets.length;
  const checkedIn = event.tickets.filter((ticket) => ticket.status === "CHECKED_IN").length;
  const unused = event.tickets.filter((ticket) => ticket.status === "UNUSED").length;
  const cancelled = event.tickets.filter((ticket) => ticket.status === "CANCELLED").length;
  const progress = total ? Math.round((checkedIn / total) * 100) : 0;
  const classRows = Array.from(
    event.tickets.reduce((map, ticket) => {
      const current = map.get(ticket.className) ?? { total: 0, checkedIn: 0, unused: 0, cancelled: 0 };
      current.total += 1;
      if (ticket.status === "CHECKED_IN") current.checkedIn += 1;
      if (ticket.status === "UNUSED") current.unused += 1;
      if (ticket.status === "CANCELLED") current.cancelled += 1;
      map.set(ticket.className, current);
      return map;
    }, new Map<string, { total: number; checkedIn: number; unused: number; cancelled: number }>()),
  ).sort(([a], [b]) => a.localeCompare(b));
  const latestScan = event.tickets
    .filter((ticket) => ticket.checkInAt)
    .sort((a, b) => Number(new Date(b.checkInAt ?? 0)) - Number(new Date(a.checkInAt ?? 0)))
    .slice(0, 5);

  const stats = [
    { label: "Total tiket", value: total, icon: Ticket, className: "bg-slate-100 text-slate-800" },
    { label: "Sudah discan", value: checkedIn, icon: CheckCircle2, className: "bg-emerald-50 text-emerald-800" },
    { label: "Belum ambil", value: unused, icon: CalendarDays, className: "bg-blue-50 text-blue-800" },
    { label: "Dibatalkan", value: cancelled, icon: XCircle, className: "bg-red-50 text-red-800" },
  ];

  return (
    <AppShell>
      <section className="mb-4 overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:mb-6 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">Rekap event</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{event.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 font-bold">
                <School size={15} />
                {event.schoolName}
              </span>
              <span className="rounded-xl bg-blue-50 px-3 py-2 font-black text-blue-800">{event.codePrefix}</span>
              {event.shootDate && (
                <span className="rounded-xl bg-slate-100 px-3 py-2 font-bold">
                  {new Date(event.shootDate).toLocaleDateString("id-ID")}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/generate" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              <QrCode size={17} />
              Buat Tiket
            </Link>
            <Link href="/scanner" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
              Buka Scan
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-2xl p-4 ${item.className}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black">{item.label}</p>
                  <Icon size={18} />
                </div>
                <p className="mt-3 text-2xl font-black md:text-3xl">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black">Progres pembagian foto</p>
            <p className="text-2xl font-black">{progress}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <div className="mb-4 grid gap-4 md:mb-6 md:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-black text-slate-950">Ringkasan per kelas</h2>
            <p className="mt-1 text-sm text-slate-500">Bantu operator melihat kelas mana yang masih banyak belum ambil.</p>
          </div>
          <div className="grid gap-2 p-3 md:hidden">
            {classRows.length ? (
              classRows.map(([className, row]) => {
                const classProgress = row.total ? Math.round((row.checkedIn / row.total) * 100) : 0;
                return (
                  <article key={className} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-slate-950">Kelas {className}</p>
                      <p className="text-sm font-black text-emerald-700">{classProgress}%</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${classProgress}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white p-2"><p className="text-slate-500">Total</p><p className="font-black">{row.total}</p></div>
                      <div className="rounded-lg bg-white p-2"><p className="text-emerald-700">Sudah</p><p className="font-black">{row.checkedIn}</p></div>
                      <div className="rounded-lg bg-white p-2"><p className="text-blue-700">Belum</p><p className="font-black">{row.unused}</p></div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Belum ada tiket.</p>
            )}
          </div>
          <div className="hidden overflow-auto md:block">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Kelas</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Sudah discan</th>
                  <th className="px-3 py-3">Belum ambil</th>
                  <th className="px-3 py-3">Batal</th>
                </tr>
              </thead>
              <tbody>
                {classRows.length ? (
                  classRows.map(([className, row]) => (
                    <tr key={className} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-black text-slate-950">{className}</td>
                      <td className="px-3 py-3">{row.total}</td>
                      <td className="px-3 py-3 text-emerald-700">{row.checkedIn}</td>
                      <td className="px-3 py-3 text-blue-700">{row.unused}</td>
                      <td className="px-3 py-3 text-red-700">{row.cancelled}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Belum ada tiket.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
          <h2 className="font-black text-slate-950">Scan terakhir</h2>
          <p className="mt-1 text-sm text-slate-500">Lima siswa terakhir yang sudah discan.</p>
          <div className="mt-4 space-y-2">
            {latestScan.length ? (
              latestScan.map((ticket) => (
                <div key={ticket.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-black text-slate-950">{ticket.studentName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ticket.className} • {ticket.checkInAt ? new Date(ticket.checkInAt).toLocaleString("id-ID") : "-"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada tiket yang discan.</p>
            )}
          </div>
        </aside>
      </div>

      {event.batches.length > 0 && (
        <section className="mb-6 rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-black text-slate-950">File tiket terakhir</h2>
            <p className="mt-1 text-sm text-slate-500">Unduh ulang hasil tiket dari event ini.</p>
          </div>
          <div className="grid gap-2 p-3 md:hidden">
            {event.batches.map((batch) => (
              <article key={batch.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{batch.totalTickets} tiket</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(batch.createdAt).toLocaleString("id-ID")} - {batch.barcodeType}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a className="rounded-lg bg-slate-950 px-2 py-2 text-center text-xs font-black text-white" href={`/api/batches/${batch.id}/download/zip`}>Gambar</a>
                  <a className="rounded-lg bg-slate-950 px-2 py-2 text-center text-xs font-black text-white" href={`/api/batches/${batch.id}/download/pdf`}>PDF</a>
                  <a className="rounded-lg bg-slate-950 px-2 py-2 text-center text-xs font-black text-white" href={`/api/batches/${batch.id}/download/csv`}>Daftar</a>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Tanggal</th>
                  <th className="px-3 py-3">Tiket</th>
                  <th className="px-3 py-3">Jenis scan</th>
                  <th className="px-3 py-3">Unduh</th>
                </tr>
              </thead>
              <tbody>
                {event.batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">{new Date(batch.createdAt).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-3">{batch.totalTickets}</td>
                    <td className="px-3 py-3">{batch.barcodeType}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white" href={`/api/batches/${batch.id}/download/zip`}>
                          <Download size={13} /> Gambar
                        </a>
                        <a className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white" href={`/api/batches/${batch.id}/download/pdf`}>PDF</a>
                        <a className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white" href={`/api/batches/${batch.id}/download/csv`}>Daftar</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div className="border-b border-slate-200 px-4 py-3 font-black text-slate-950">Tiket terakhir</div>
        {event.tickets.length ? (
          <>
          <div className="grid gap-2 p-3 md:hidden">
            {event.tickets.slice(0, 80).map((ticket) => (
              <article key={ticket.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{ticket.studentName}</p>
                    <p className="mt-1 text-xs text-slate-500">{ticket.className}</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-2 break-all font-mono text-[11px] text-slate-500">{ticket.ticketCode}</p>
                {ticket.generatedImagePath && <a className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white" href={ticket.generatedImagePath}>Buka gambar</a>}
              </article>
            ))}
          </div>
          <div className="hidden overflow-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Kode</th>
                  <th className="px-3 py-2">Siswa</th>
                  <th className="px-3 py-2">Kelas</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">File</th>
                </tr>
              </thead>
              <tbody>
                {event.tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{ticket.ticketCode}</td>
                    <td className="px-3 py-2">{ticket.studentName}</td>
                    <td className="px-3 py-2">{ticket.className}</td>
                    <td className="px-3 py-2"><StatusBadge status={ticket.status} /></td>
                    <td className="px-3 py-2">
                      {ticket.generatedImagePath ? <a className="font-bold text-blue-700 underline" href={ticket.generatedImagePath}>Gambar</a> : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <p className="p-4 text-sm text-slate-500">Belum ada tiket untuk event ini.</p>
        )}
      </section>
    </AppShell>
  );
}
