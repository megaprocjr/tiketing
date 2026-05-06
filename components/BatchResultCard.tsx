import { Download } from "lucide-react";

export function BatchResultCard({
  batch,
  tickets = [],
  skippedRows = 0,
}: {
  batch: {
    totalTickets: number;
    zipPath?: string | null;
    pdfPath?: string | null;
    manifestPath?: string | null;
    batches?: { totalTickets: number; zipPath?: string | null; pdfPath?: string | null; manifestPath?: string | null }[];
  };
  tickets?: { id: string; ticketCode: string; studentName: string; className: string; generatedImagePath?: string | null }[];
  skippedRows?: number;
}) {
  const links = [
    { href: batch.zipPath, label: "Unduh semua gambar" },
    { href: batch.pdfPath, label: "Unduh PDF gabungan" },
    { href: batch.manifestPath, label: "Unduh daftar tiket" },
  ].filter((item): item is { href: string; label: string } => Boolean(item.href));

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-lg shadow-emerald-100/70 md:p-5">
      <h3 className="text-base font-black text-emerald-950">Tiket berhasil dibuat</h3>
      <p className="mt-1 text-sm text-emerald-800">
        {batch.totalTickets} tiket baru berhasil dibuat{skippedRows ? `, ${skippedRows} data yang sama dilewati` : ""}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            download
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-black text-white hover:bg-emerald-800"
          >
            <Download size={16} />
            {link.label}
          </a>
        ))}
      </div>
      {batch.batches && batch.batches.length > 1 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-white">
          <div className="bg-emerald-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-900">
            File unduhan dibuat per bagian
          </div>
          <div className="divide-y divide-emerald-100">
            {batch.batches.map((item, index) => (
              <div key={`${item.zipPath}-${index}`} className="flex flex-col gap-2 px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
                <p className="font-black text-slate-900">Bagian {index + 1} • {item.totalTickets} tiket</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { href: item.zipPath, label: "Gambar" },
                    { href: item.pdfPath, label: "PDF" },
                    { href: item.manifestPath, label: "Daftar" },
                  ]
                    .filter((link): link is { href: string; label: string } => Boolean(link.href))
                    .map((link) => (
                      <a key={link.href} href={link.href} download className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-black text-white hover:bg-emerald-800">
                        {link.label}
                      </a>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tickets.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Contoh tiket jadi</p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {tickets.slice(0, 6).map((ticket) => (
              <a
                key={ticket.id}
                href={ticket.generatedImagePath ?? "#"}
                className="overflow-hidden rounded-xl border border-emerald-200 bg-white text-xs font-bold text-slate-700 shadow-sm"
              >
                {ticket.generatedImagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ticket.generatedImagePath} alt={ticket.studentName} className="aspect-[1.85/1] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[1.85/1] place-items-center bg-slate-100 text-slate-400">Belum ada gambar</div>
                )}
                <div className="p-2">
                  <p className="truncate">{ticket.studentName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{ticket.className} - {ticket.ticketCode}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
