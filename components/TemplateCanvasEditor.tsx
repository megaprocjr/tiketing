"use client";

import { useMemo, useRef, useState } from "react";
import { LayoutTemplate, LoaderCircle, Move, RotateCw, Save, Wand2 } from "lucide-react";
import { BarcodeTypeSelector } from "./BarcodeTypeSelector";
import type { BarcodeType } from "@/lib/validations";

type Placement = {
  barcodeType: BarcodeType;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  rotation: number;
  background: "white" | "transparent";
  foreground: string;
  showText: boolean;
  showStudentName: boolean;
  studentNameBackground: "white" | "transparent";
  studentNameOffsetPercent: number;
  studentNameFontPercent: number;
};

type Template = {
  id: string;
  name: string;
  filePath: string;
  width: number;
  height: number;
};

const barcodePresets: Record<BarcodeType, { widthPercent: number; heightPercent: number; rotation: number | "keep"; showText: boolean }> = {
  qrcode: { widthPercent: 18, heightPercent: 18, rotation: 0, showText: false },
  code128: { widthPercent: 30, heightPercent: 10, rotation: "keep", showText: false },
  pdf417: { widthPercent: 30, heightPercent: 14, rotation: "keep", showText: false },
};

const quickPresets: Array<{ label: string; note: string; placement: Partial<Placement> }> = [
  {
    label: "QR kanan",
    note: "Kotak di sisi kanan tiket",
    placement: { barcodeType: "qrcode", xPercent: 80, yPercent: 35, widthPercent: 16, heightPercent: 16, rotation: 0, showText: false },
  },
  {
    label: "Barcode vertikal",
    note: "Garis memanjang diputar",
    placement: { barcodeType: "code128", xPercent: 76, yPercent: 36, widthPercent: 28, heightPercent: 9, rotation: 90, showText: false },
  },
  {
    label: "Barcode bawah",
    note: "Garis horizontal di bawah",
    placement: { barcodeType: "code128", xPercent: 60, yPercent: 72, widthPercent: 30, heightPercent: 9, rotation: 0, showText: false },
  },
  {
    label: "PDF417 kanan",
    note: "Barcode bertumpuk",
    placement: { barcodeType: "pdf417", xPercent: 65, yPercent: 58, widthPercent: 30, heightPercent: 14, rotation: 0, showText: false },
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizePlacement(placement: Placement): Placement {
  if (placement.barcodeType !== "qrcode" || Math.abs(placement.widthPercent - placement.heightPercent) < 0.01) {
    return placement;
  }
  const side = Math.min(placement.widthPercent, placement.heightPercent);
  const centerX = placement.xPercent + placement.widthPercent / 2;
  const centerY = placement.yPercent + placement.heightPercent / 2;
  return {
    ...placement,
    widthPercent: side,
    heightPercent: side,
    rotation: 0,
    xPercent: clamp(centerX - side / 2, 0, 100 - side),
    yPercent: clamp(centerY - side / 2, 0, 100 - side),
  };
}

export function TemplateCanvasEditor({
  template,
  initialPlacement,
}: {
  template: Template;
  initialPlacement: Placement;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement>(() => normalizePlacement(initialPlacement));
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const barcodeStyle = useMemo(
    () => ({
      left: `${placement.xPercent}%`,
      top: `${placement.yPercent}%`,
      width: `${placement.widthPercent}%`,
      height: `${placement.heightPercent}%`,
      transform: `rotate(${placement.rotation}deg)`,
      transformOrigin: "center center",
    }),
    [placement],
  );
  const labelStyle = useMemo(() => {
    const fontSizePercent = placement.studentNameFontPercent / (template.height / 100);
    const labelTopPercent = 100 + (placement.studentNameOffsetPercent / Math.max(placement.heightPercent, 0.1)) * 100;
    return {
      left: "0%",
      top: `${labelTopPercent}%`,
      width: "100%",
      minHeight: `${Math.max(2.4, fontSizePercent * 1.9)}%`,
      fontSize: `${Math.max(10, template.width * (placement.studentNameFontPercent / 100) * 0.18)}px`,
      background: placement.studentNameBackground === "white" ? "rgba(255,255,255,0.92)" : "transparent",
    };
  }, [placement, template]);

  function update(partial: Partial<Placement>) {
    setPlacement((current) => ({ ...current, ...partial }));
  }

  function updateNumber(key: keyof Pick<Placement, "xPercent" | "yPercent" | "widthPercent" | "heightPercent">, value: number) {
    setPlacement((current) => {
      if (current.barcodeType === "qrcode" && (key === "widthPercent" || key === "heightPercent")) {
        const side = clamp(value, 1, 100);
        const centerX = current.xPercent + current.widthPercent / 2;
        const centerY = current.yPercent + current.heightPercent / 2;
        return {
          ...current,
          widthPercent: side,
          heightPercent: side,
          xPercent: clamp(centerX - side / 2, 0, 100 - side),
          yPercent: clamp(centerY - side / 2, 0, 100 - side),
        };
      }
      return { ...current, [key]: value };
    });
  }

  function applyBarcodeType(barcodeType: BarcodeType) {
    const preset = barcodePresets[barcodeType];
    setPlacement((current) => {
      const centerX = current.xPercent + current.widthPercent / 2;
      const centerY = current.yPercent + current.heightPercent / 2;
      const widthPercent = barcodeType === "qrcode" ? Math.min(preset.widthPercent, 28) : preset.widthPercent;
      const heightPercent = barcodeType === "qrcode" ? widthPercent : preset.heightPercent;
      return {
        ...current,
        barcodeType,
        widthPercent,
        heightPercent,
        rotation: preset.rotation === "keep" ? current.rotation : preset.rotation,
        showText: preset.showText,
        xPercent: clamp(centerX - widthPercent / 2, 0, 100 - widthPercent),
        yPercent: clamp(centerY - heightPercent / 2, 0, 100 - heightPercent),
      };
    });
    setMessage(
      barcodeType === "qrcode"
        ? "Area barcode disesuaikan menjadi kotak untuk QR Code."
        : barcodeType === "code128"
          ? "Area barcode disesuaikan menjadi memanjang untuk barcode garis."
          : "Area barcode disesuaikan menjadi memanjang bertumpuk.",
    );
  }

  function applyQuickPreset(preset: (typeof quickPresets)[number]) {
    setPlacement((current) => normalizePlacement({
      ...current,
      ...preset.placement,
      showStudentName: true,
      studentNameBackground: current.studentNameBackground,
      studentNameOffsetPercent: current.studentNameOffsetPercent,
      studentNameFontPercent: current.studentNameFontPercent,
    }));
    setMessage(`Preset "${preset.label}" dipakai. Geser sedikit kalau perlu.`);
  }

  function onDrag(clientX: number, clientY: number) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    update({
      xPercent: Math.max(0, Math.min(100 - placement.widthPercent, x)),
      yPercent: Math.max(0, Math.min(100 - placement.heightPercent, y)),
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/templates/${template.id}/placement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(placement),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan posisi.");
      setMessage("Posisi barcode tersimpan.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan posisi.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function testPreview() {
    setPreviewing(true);
    const saved = await save();
    if (!saved) {
      setPreviewing(false);
      return;
    }
    setMessage("Membuat preview ringan...");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch(`/api/templates/${template.id}/preview`, {
        method: "POST",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({ error: "Server belum mengirim pesan preview." }));
      if (!response.ok) {
        setMessage(data.error ?? "Gagal membuat preview.");
        return;
      }
      setPreview(`${data.imagePath}?t=${Date.now()}`);
      setMessage("Preview dummy berhasil dibuat.");
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Preview terlalu lama. Coba ulangi, atau kecilkan ukuran desain sebelum upload."
          : "Preview belum berhasil dibuat. Coba ulangi sebentar lagi.",
      );
    } finally {
      window.clearTimeout(timer);
      setPreviewing(false);
    }
  }

  return (
    <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="self-start rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div
          ref={boxRef}
          className="relative mx-auto overflow-hidden rounded-xl bg-slate-100"
          style={{ aspectRatio: `${template.width}/${template.height}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={template.filePath} alt={template.name} className="absolute inset-0 h-full w-full object-contain" />
          <div className="absolute overflow-visible" style={barcodeStyle}>
            <button
              type="button"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                onDrag(event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                if (event.buttons === 1) onDrag(event.clientX, event.clientY);
              }}
              className="absolute inset-0 grid place-items-center border-2 border-blue-600 bg-white/90 text-blue-800 shadow"
              title="Geser barcode"
            >
              <Move size={18} />
              <span className="sr-only">Geser barcode</span>
            </button>
            {placement.showStudentName && (
              <div
                className="pointer-events-none absolute grid place-items-center rounded border border-dashed border-emerald-600 px-1 text-center font-bold text-emerald-900"
                style={labelStyle}
              >
                Budi Santoso
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:p-5">
        <div>
          <h2 className="text-lg font-black text-slate-950">Atur Barcode</h2>
          <p className="mt-1 text-sm text-slate-500">Posisi ini dipakai saat tiket dicetak agar tetap pas di desain asli.</p>
        </div>
        <BarcodeTypeSelector value={placement.barcodeType} onChange={applyBarcodeType} />
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
          Saat jenis kode diganti, garis biru otomatis mengikuti bentuk yang paling mudah discan.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
            <LayoutTemplate size={17} className="text-blue-700" />
            Preset cepat
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyQuickPreset(preset)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="block text-sm font-black text-slate-950">{preset.label}</span>
                <span className="mt-1 block text-xs leading-4 text-slate-500">{preset.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["X", "xPercent"],
            ["Y", "yPercent"],
            ["Lebar", "widthPercent"],
            ["Tinggi", "heightPercent"],
          ].map(([label, key]) => (
            <label key={key} className="text-sm font-bold text-slate-700">
              {label} %
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                type="number"
                step="0.1"
                value={placement[key as keyof Placement] as number}
                onChange={(event) =>
                  updateNumber(
                    key as keyof Pick<Placement, "xPercent" | "yPercent" | "widthPercent" | "heightPercent">,
                    Number(event.target.value),
                  )
                }
              />
            </label>
          ))}
        </div>
        <label className="text-sm font-bold text-slate-700">
          Rotasi barcode
          <div className="mt-1 flex items-center gap-2">
            <RotateCw size={17} className="text-slate-500" />
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="number"
              min={-180}
              max={180}
              step="1"
              value={placement.rotation}
              onChange={(event) => update({ rotation: Number(event.target.value) })}
            />
            <span className="text-sm text-slate-500">deg</span>
          </div>
          <input
            className="mt-2 w-full accent-blue-600"
            type="range"
            min={-180}
            max={180}
            step="1"
            value={placement.rotation}
            onChange={(event) => update({ rotation: Number(event.target.value) })}
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Background
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={placement.background}
            onChange={(event) => update({ background: event.target.value as Placement["background"] })}
          >
            <option value="white">Putih</option>
            <option value="transparent">Transparan</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={placement.showText} onChange={(event) => update({ showText: event.target.checked })} />
          Tampilkan kode kecil di bawah barcode garis
        </label>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <input
              type="checkbox"
              checked={placement.showStudentName}
              onChange={(event) => update({ showStudentName: event.target.checked })}
            />
            Tampilkan nama siswa
          </label>
          <label className="text-sm font-bold text-slate-700">
            Background nama
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={placement.studentNameBackground}
              onChange={(event) => update({ studentNameBackground: event.target.value as Placement["studentNameBackground"] })}
              disabled={!placement.showStudentName}
            >
              <option value="white">Putih</option>
              <option value="transparent">Transparan</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-slate-700">
              Jarak bawah %
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                type="number"
                step="0.1"
                min={-50}
                max={50}
                value={placement.studentNameOffsetPercent}
                onChange={(event) => update({ studentNameOffsetPercent: Number(event.target.value) })}
                disabled={!placement.showStudentName}
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Ukuran font %
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                type="number"
                step="0.1"
                min={0.8}
                max={12}
                value={placement.studentNameFontPercent}
                onChange={(event) => update({ studentNameFontPercent: Number(event.target.value) })}
                disabled={!placement.showStudentName}
              />
            </label>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Garis hijau menunjukkan posisi nama siswa. Nama mengikuti bagian bawah barcode.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={saving || previewing}
            onClick={save}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} />
            Simpan Posisi
          </button>
          <button
            type="button"
            onClick={testPreview}
            disabled={saving || previewing}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {previewing ? <LoaderCircle size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {previewing ? "Membuat preview..." : "Coba Preview"}
          </button>
        </div>
        {message && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
        {preview && (
          <a href={preview} target="_blank" className="block overflow-hidden rounded-xl border border-slate-200" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview dummy" className="w-full" />
          </a>
        )}
      </aside>
    </div>
  );
}
