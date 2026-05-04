"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, FileImage, Home, QrCode, ScanLine, Settings, Users } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

const nav = [
  { href: "/", label: "Beranda", mobileLabel: "Beranda", icon: Home },
  { href: "/events", label: "Event Foto", mobileLabel: "Event", icon: Users },
  { href: "/templates", label: "Desain Tiket", mobileLabel: "Desain", icon: FileImage },
  { href: "/generate", label: "Buat Tiket", mobileLabel: "Buat", icon: QrCode },
  { href: "/scanner", label: "Scan Tiket", mobileLabel: "Scan", icon: ScanLine },
  { href: "/settings", label: "Pengaturan", mobileLabel: "Atur", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; roleLabel: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => undefined);
  }, []);

  const visibleNav = useMemo(() => {
    if (user?.role === "OPERATOR") return nav.filter((item) => item.href === "/scanner");
    if (user?.role === "ADMIN") return nav.filter((item) => item.href !== "/settings");
    return nav;
  }, [user]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.12),transparent_28rem),linear-gradient(180deg,#f8fbff_0%,#eef3f9_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 max-[380px]:px-3">
          <Link href="/" className="group flex items-center gap-3 text-sm font-bold text-slate-950">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition group-hover:-translate-y-0.5">
              <Camera size={19} />
            </span>
              <span className="leading-tight">
                <span className="block">School Photo Ticket Studio</span>
              <span className="hidden text-[11px] font-semibold text-slate-500 lg:block">Kelola tiket foto sekolah</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <span className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                {user.name === user.roleLabel ? user.roleLabel : `${user.name} - ${user.roleLabel}`}
              </span>
            )}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:pb-10 md:pt-8 max-[380px]:px-3">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-white/70 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-slate-900/10 backdrop-blur-xl md:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.max(visibleNav.length, 1)}, minmax(0, 1fr))` }}
      >
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mx-0.5 my-1 grid min-w-0 place-items-center gap-1 rounded-xl px-0.5 py-2 text-[10.5px] font-black leading-none transition ${
                active ? "bg-blue-50 text-blue-700" : "text-slate-600"
              }`}
            >
              <Icon size={17} />
              <span className="max-w-full truncate whitespace-nowrap">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
