import { AppShell } from "@/components/AppShell";
import { ScannerPanel } from "@/components/ScannerPanel";

export default function ScannerPage() {
  return (
    <AppShell>
      <section className="mb-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:mb-6 md:p-6">
        <p className="text-sm font-black uppercase tracking-wide text-amber-600">Scan tiket</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Scan Saat Pengambilan Foto</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Arahkan kamera ke kode pada tiket. Hasil scan langsung menampilkan nama siswa, kelas, paket, dan status pengambilan.
        </p>
      </section>
      <ScannerPanel />
    </AppShell>
  );
}
