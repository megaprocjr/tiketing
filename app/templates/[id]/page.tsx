import { AppShell } from "@/components/AppShell";
import { TemplateCanvasEditor } from "@/components/TemplateCanvasEditor";
import { db } from "@/lib/db";

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await db.ticketTemplate.findUnique({
    where: { id },
    include: { placements: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });

  if (!template) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/70">Desain tidak ditemukan.</div>
      </AppShell>
    );
  }

  const placement = template.placements[0] ?? {
    barcodeType: "qrcode",
    xPercent: 68,
    yPercent: 58,
    widthPercent: 18,
    heightPercent: 18,
    rotation: 0,
    background: "white",
    foreground: "black",
    showText: false,
    showStudentName: true,
    studentNameBackground: "white",
    studentNameOffsetPercent: 1.5,
    studentNameFontPercent: 3,
  };

  return (
    <AppShell>
      <section className="mb-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/70 backdrop-blur md:mb-6 md:p-6">
        <p className="text-sm font-black uppercase tracking-wide text-violet-700">Atur kode scan</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Posisi Barcode dan Nama Siswa</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Desain: {template.name}. Geser garis biru ke area yang diinginkan, lalu simpan sebelum membuat tiket banyak.
        </p>
      </section>
      <TemplateCanvasEditor
        template={template}
        initialPlacement={{
          barcodeType: placement.barcodeType as "qrcode" | "code128" | "pdf417",
          xPercent: placement.xPercent,
          yPercent: placement.yPercent,
          widthPercent: placement.widthPercent,
          heightPercent: placement.heightPercent,
          rotation: "rotation" in placement ? placement.rotation : 0,
          background: placement.background as "white" | "transparent",
          foreground: placement.foreground,
          showText: placement.showText,
          showStudentName: "showStudentName" in placement ? placement.showStudentName : true,
          studentNameBackground: ("studentNameBackground" in placement ? placement.studentNameBackground : "white") as "white" | "transparent",
          studentNameOffsetPercent: "studentNameOffsetPercent" in placement ? placement.studentNameOffsetPercent : 1.5,
          studentNameFontPercent: "studentNameFontPercent" in placement ? placement.studentNameFontPercent : 3,
        }}
      />
    </AppShell>
  );
}
