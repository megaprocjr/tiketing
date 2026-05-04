import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  UNUSED: "Belum ambil",
  CHECKED_IN: "Sudah discan",
  CANCELLED: "Dibatalkan",
  VALID: "Tiket valid",
  ALREADY_USED: "Sudah pernah discan",
  NOT_FOUND: "Tidak ditemukan",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-1 text-xs font-black",
        status === "UNUSED" && "bg-slate-100 text-slate-700",
        (status === "CHECKED_IN" || status === "VALID") && "bg-emerald-100 text-emerald-700",
        (status === "CANCELLED" || status === "NOT_FOUND") && "bg-red-100 text-red-700",
        status === "ALREADY_USED" && "bg-amber-100 text-amber-700",
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
