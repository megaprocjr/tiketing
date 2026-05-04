import { AppShell } from "@/components/AppShell";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <AppShell>
      <section className="mb-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:mb-6 md:p-6">
        <p className="text-sm font-black uppercase tracking-wide text-slate-700">Pengaturan</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Siapkan Studio Sebelum Event</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Atur akun pengguna, simpan cadangan data, pulihkan cadangan, dan bersihkan data percobaan sebelum dipakai di acara sungguhan.
        </p>
      </section>
      <SettingsClient />
    </AppShell>
  );
}
