"use client";

import { AlertCircle } from "lucide-react";
import type { CsvStudentRow } from "@/lib/csv";

export function CsvPreviewTable({
  rows,
  errors,
}: {
  rows: CsvStudentRow[];
  errors: { row: number; message: string }[];
}) {
  if (errors.length) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-lg shadow-red-100/60">
        <div className="flex items-center gap-2 font-black">
          <AlertCircle size={17} />
          Data siswa perlu diperbaiki
        </div>
        <ul className="mt-3 space-y-1">
          {errors.slice(0, 8).map((error, index) => (
            <li key={`${error.row}-${index}`}>Baris {error.row || "-"}: {error.message}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-black text-slate-950">Preview data siswa ({rows.length} baris)</p>
        <p className="mt-1 text-xs text-slate-500 md:hidden">Tampilan HP menampilkan 12 data pertama. Daftar lengkap tetap dipakai saat tiket dibuat.</p>
      </div>
      <div className="grid gap-2 p-3 md:hidden">
        {rows.slice(0, 12).map((row, index) => (
          <article key={`${row.student_name}-${index}`} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">{row.student_name}</p>
                <p className="mt-1 text-xs text-slate-500">{row.class_name}</p>
              </div>
              {row.student_id && <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600">{row.student_id}</span>}
            </div>
            {row.phone && <p className="mt-2 text-xs text-slate-500">{row.phone}</p>}
          </article>
        ))}
      </div>
      <div className="hidden max-h-80 overflow-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Kelas</th>
              <th className="px-3 py-2">Nomor siswa</th>
              <th className="px-3 py-2">Telepon</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((row, index) => (
              <tr key={`${row.student_name}-${index}`} className="border-t border-slate-100">
                <td className="px-3 py-2">{row.student_name}</td>
                <td className="px-3 py-2">{row.class_name}</td>
                <td className="px-3 py-2">{row.student_id}</td>
                <td className="px-3 py-2">{row.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
