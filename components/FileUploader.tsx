"use client";

import { Upload } from "lucide-react";

export function FileUploader({
  label,
  accept,
  onChange,
}: {
  label: string;
  accept: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white p-5 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/40">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition group-hover:-translate-y-0.5">
        <Upload size={22} />
      </span>
      <span className="mt-3 text-sm font-black text-slate-950">{label}</span>
      <span className="mt-1 text-xs font-medium text-slate-500">Klik untuk pilih file dari perangkat</span>
      <input className="sr-only" type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
    </label>
  );
}
