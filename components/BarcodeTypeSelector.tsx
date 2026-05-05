"use client";

import { Barcode, QrCode } from "lucide-react";
import type { BarcodeType } from "@/lib/validations";
import { cn } from "@/lib/utils";

const types: { value: BarcodeType; label: string; note: string }[] = [
  { value: "qrcode", label: "QR Code", note: "Paling mudah discan kamera HP." },
  { value: "code128", label: "Barcode garis", note: "Cocok untuk kode memanjang." },
  { value: "pdf417", label: "Barcode bertumpuk", note: "Bentuk lebar dengan banyak garis." },
];

export function BarcodeTypeSelector({ value, onChange }: { value: BarcodeType; onChange: (value: BarcodeType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {types.map((type) => {
        const active = value === type.value;
        const Icon = type.value === "qrcode" ? QrCode : Barcode;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "focus-ring min-h-[104px] rounded-2xl border p-2.5 text-left transition md:min-h-[126px] md:p-3",
              active
                ? "border-blue-600 bg-white text-blue-950 shadow-lg shadow-blue-100"
                : "border-slate-200 bg-white/70 text-slate-700 hover:border-blue-200 hover:bg-white",
            )}
          >
            <div className="flex flex-col gap-1 font-black leading-tight md:flex-row md:items-center md:gap-2">
              <Icon size={15} className="shrink-0 md:size-[17px]" />
              <span className="text-[12px] md:text-base">{type.label}</span>
            </div>
            <p className="mt-1 text-[10.5px] leading-4 text-slate-500 md:text-xs md:leading-5">{type.note}</p>
          </button>
        );
      })}
    </div>
  );
}
