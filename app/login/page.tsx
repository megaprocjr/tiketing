"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { Camera, CheckCircle2, Lock, QrCode, ScanLine, ShieldCheck, UserRound } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("superadmin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const rolePresets = [
    { label: "Pemilik", username: "superadmin", pin: "123456", tone: "bg-blue-600 text-white shadow-blue-600/25" },
    { label: "Admin", username: "admin", pin: "222222", tone: "bg-white/15 text-white ring-1 ring-white/20" },
    { label: "Scan", username: "operator", pin: "333333", tone: "bg-white/15 text-white ring-1 ring-white/20" },
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Login gagal.");
      return;
    }
    router.replace(searchParams.get("next") || "/");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_480px]">
        <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.55),transparent_28rem),radial-gradient(circle_at_72%_28%,rgba(14,165,233,0.28),transparent_30rem),linear-gradient(135deg,#020617_0%,#0f172a_48%,#172554_100%)] lg:block">
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="absolute inset-y-0 right-0 w-[62%] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.07)_28%,rgba(255,255,255,0.16)_100%)]" />
          <div className="absolute right-[-8%] top-[10%] h-[78%] w-[48%] rotate-6 rounded-[2rem] border border-white/10 bg-white/[0.07] shadow-2xl shadow-blue-950/40 backdrop-blur-md" />
          <div className="absolute right-[8%] top-[18%] h-[54%] w-[25%] rotate-6 rounded-2xl border border-white/15 bg-white/[0.09] backdrop-blur-sm">
            <div className="mx-7 mt-10 h-2 rounded-full bg-white/25" />
            <div className="mx-7 mt-4 h-2 rounded-full bg-white/15" />
            <div className="mx-7 mt-10 grid grid-cols-9 gap-1">
              {Array.from({ length: 72 }).map((_, index) => (
                <span key={index} className={`h-7 rounded-sm ${index % 5 === 0 || index % 7 === 0 ? "bg-white/75" : "bg-white/20"}`} />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.6),rgba(2,6,23,0.2),rgba(2,6,23,0.05))]" />
          <div className="relative flex min-h-screen flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center gap-3 text-white">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
                <Camera size={22} />
              </span>
              <div>
                <p className="text-sm font-bold">School Photo Ticket Studio</p>
                <p className="text-xs text-blue-100">Kelola tiket foto sekolah</p>
              </div>
            </div>

            <div className="max-w-2xl pb-10">
              <p className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black uppercase text-blue-100 backdrop-blur">
                <ShieldCheck size={15} />
                Data siswa tetap lokal
              </p>
              <h1 className="mt-5 max-w-xl text-5xl font-bold leading-tight text-white xl:text-6xl">
                Studio tiket photoshoot yang siap dipakai di hari event.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-200">
                Buat tiket dari data siswa, pasang barcode di desain tiket, scan saat pengambilan, lalu rekap siapa yang sudah hadir.
              </p>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ["Buat tiket", QrCode],
                  ["Scan", ScanLine],
                  ["Rekap", CheckCircle2],
                ].map(([label, Icon]) => (
                  <div key={String(label)} className="rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur">
                    <Icon size={20} />
                    <p className="mt-3 text-sm font-bold">{String(label)}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="max-w-md text-xs leading-5 text-slate-300">
              Dirancang untuk operator sekolah dan vendor foto: cepat di laptop, ramah HP, dan mudah dibackup sebelum event dimulai.
            </p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.28),transparent_18rem),radial-gradient(circle_at_85%_16%,rgba(16,185,129,0.18),transparent_18rem),linear-gradient(180deg,#eff6ff_0%,#f8fafc_48%,#eaf0f7_100%)] px-4 py-5 sm:px-5 sm:py-8">
          <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(135deg,#0f2f7c_0%,#0f766e_100%)] lg:hidden" />
          <div className="absolute inset-x-0 top-0 h-64 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:34px_34px] lg:hidden" />
          <div className="relative w-full max-w-md">
            <div className="mb-4 overflow-hidden rounded-[1.7rem] border border-white/15 bg-slate-950 p-4 text-white shadow-2xl shadow-blue-900/20 lg:hidden">
              <div className="absolute inset-0 -z-10" />
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-700 shadow-lg shadow-slate-950/20">
                  <Camera size={22} />
                </span>
                <div>
                  <p className="text-sm font-black">School Photo Ticket Studio</p>
                  <p className="text-xs text-blue-100">Kelola tiket foto sekolah</p>
                </div>
              </div>
              <h1 className="mt-6 text-3xl font-black leading-tight">Masuk ke studio tiket foto.</h1>
              <p className="mt-3 text-sm leading-6 text-blue-50">
                Buat tiket, scan pengambilan, dan pantau daftar siswa dari satu tempat.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {rolePresets.map((role) => (
                  <button
                    key={role.label}
                    type="button"
                    onClick={() => {
                      setUsername(role.username);
                      setPin(role.pin);
                      setError("");
                    }}
                    className={`rounded-2xl px-2 py-3 text-center text-xs font-black shadow-lg ${role.tone}`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submit} className="rounded-[1.7rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-slate-300/70 backdrop-blur sm:p-5">
              <div className="mb-5">
                <p className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase text-blue-700">Akses pengguna</p>
                <h2 className="mt-3 text-2xl font-black text-slate-950">Masuk Studio</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Pakai akun sesuai tugas saat event.
                </p>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Username
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-inner shadow-slate-200/50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                  <UserRound size={16} className="text-slate-400" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    placeholder="superadmin"
                    autoFocus
                  />
                </div>
              </label>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                PIN
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-inner shadow-slate-200/50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                  <Lock size={16} className="text-slate-400" />
                  <input
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    type="password"
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    placeholder="PIN pengguna"
                  />
                </div>
              </label>
              {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button
                disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-black text-white shadow-xl shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-60"
              >
                <ShieldCheck size={18} />
                {loading ? "Masuk..." : "Masuk ke Studio"}
              </button>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] leading-4 text-slate-600 min-[390px]:text-xs">
                {rolePresets.map((role) => (
                  <button
                    key={role.username}
                    type="button"
                    onClick={() => {
                      setUsername(role.username);
                      setPin(role.pin);
                      setError("");
                    }}
                    className={`rounded-2xl px-2 py-3 text-left transition ${
                      username === role.username ? "bg-blue-50 text-blue-800 ring-2 ring-blue-200" : "bg-slate-100 hover:bg-slate-200"
                    }`}
                  >
                    <span className="block font-black">{role.label}</span>
                    <span className="mt-1 block truncate">{role.pin}</span>
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 p-4 text-xs leading-5 text-slate-500 shadow-lg shadow-slate-200/60 backdrop-blur">
              Ganti PIN default di menu Pengaturan sebelum dipakai untuk event sungguhan.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center px-4 text-sm text-slate-500">Memuat login...</main>}>
      <LoginForm />
    </Suspense>
  );
}
