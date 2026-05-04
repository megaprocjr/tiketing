"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm md:flex"
    >
      <LogOut size={16} />
      Keluar
    </button>
  );
}
