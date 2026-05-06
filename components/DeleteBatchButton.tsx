"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type DeleteBatchButtonProps = {
  batchId: string;
  totalTickets: number;
  className?: string;
};

export function DeleteBatchButton({ batchId, totalTickets, className = "" }: DeleteBatchButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Hapus file tiket ini?\n\n${totalTickets} tiket dari file ini akan ikut dihapus dari rekap dan daftar scan.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/batches/${batchId}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "File tiket belum bisa dihapus.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File tiket belum bisa dihapus.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:py-1"
      >
        <Trash2 size={13} />
        {isDeleting ? "Menghapus..." : "Hapus"}
      </button>
      {message && <p className="mt-2 text-xs font-bold text-red-700">{message}</p>}
    </div>
  );
}
