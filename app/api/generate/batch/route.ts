import { NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { db } from "@/lib/db";
import { batchFolderName, deleteStoredFile, sanitizeFilePart, saveGeneratedFile } from "@/lib/files";
import { composeTicketImage } from "@/lib/image-compose";
import { formatTicketCode } from "@/lib/ticket-code";
import { generateBatchSchema } from "@/lib/validations";

export const maxDuration = 60;
const maxOnlineRows = 80;

function csvCell(value: string | null | undefined) {
  const text = value ?? "";
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function studentKey(row: { student_name: string; class_name: string; student_id?: string }) {
  const id = row.student_id?.trim().toLowerCase();
  const name = row.student_name.trim().toLowerCase();
  const className = row.class_name.trim().toLowerCase();
  return id ? `id:${id}|class:${className}` : `name:${name}|class:${className}`;
}

async function makePdfImage(input: Buffer) {
  if (!process.env.VERCEL) return input;
  return sharp(input)
    .resize({ width: 1600, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = generateBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data generate tidak valid." }, { status: 400 });
  }

  const event = await db.event.findUnique({ where: { id: parsed.data.eventId } });
  const template = await db.ticketTemplate.findUnique({
    where: { id: parsed.data.templateId },
    include: { placements: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  const placement = template?.placements[0];
  if (!event) return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  if (!template || !placement) return NextResponse.json({ error: "Desain atau posisi barcode belum siap." }, { status: 404 });

  const incomingKeys = new Map<string, string>();
  const duplicateRows = new Set<string>();
  const rowsUniqueInFile: (typeof parsed.data.rows)[number][] = [];
  for (const row of parsed.data.rows) {
    const key = studentKey(row);
    const label = `${row.student_name} (${row.class_name}${row.student_id ? `, ID ${row.student_id}` : ""})`;
    if (incomingKeys.has(key)) {
      duplicateRows.add(label);
    } else {
      rowsUniqueInFile.push(row);
    }
    incomingKeys.set(key, label);
  }
  if (duplicateRows.size > 0 && parsed.data.duplicateMode !== "skip") {
    return NextResponse.json(
      { error: `File data berisi siswa dobel: ${Array.from(duplicateRows).slice(0, 5).join(", ")}.` },
      { status: 400 },
    );
  }

  const existingTickets = await db.ticket.findMany({
    where: { eventId: event.id },
    select: { id: true, ticketCode: true, studentName: true, className: true, studentId: true, status: true },
  });
  const existingByKey = new Map(
    existingTickets.map((ticket) => [
      ticket.studentId?.trim()
        ? `id:${ticket.studentId.trim().toLowerCase()}|class:${ticket.className.trim().toLowerCase()}`
        : `name:${ticket.studentName.trim().toLowerCase()}|class:${ticket.className.trim().toLowerCase()}`,
      ticket,
    ]),
  );
  const existingMatches = rowsUniqueInFile
    .map((row) => ({ row, ticket: existingByKey.get(studentKey(row)) }))
    .filter((item): item is { row: (typeof parsed.data.rows)[number]; ticket: (typeof existingTickets)[number] } =>
      Boolean(item.ticket),
    );
  if (existingMatches.length > 0 && parsed.data.duplicateMode !== "skip") {
    const sample = existingMatches
      .slice(0, 6)
      .map(({ row }) => `${row.student_name} (${row.class_name}${row.student_id ? `, ID ${row.student_id}` : ""})`)
      .join(", ");
    return NextResponse.json(
      {
        error: `Tiket belum dibuat karena ${existingMatches.length} siswa sudah punya tiket di event ini: ${sample}. Hapus tiket lama atau pakai event baru jika ingin membuat ulang.`,
        duplicates: existingMatches.map(({ row, ticket }) => ({ row, ticket })),
      },
      { status: 409 },
    );
  }

  const existingKeys = new Set(existingMatches.map(({ row }) => studentKey(row)));
  const rowsToGenerate =
    parsed.data.duplicateMode === "skip" ? rowsUniqueInFile.filter((row) => !existingKeys.has(studentKey(row))) : rowsUniqueInFile;
  const skippedRows =
    parsed.data.duplicateMode === "skip"
      ? parsed.data.rows.length - rowsToGenerate.length
      : 0;

  if (rowsToGenerate.length === 0) {
    return NextResponse.json(
      { error: "Semua data sudah pernah dibuat. Tidak ada tiket baru yang perlu dibuat." },
      { status: 409 },
    );
  }

  if (process.env.VERCEL && rowsToGenerate.length > maxOnlineRows) {
    return NextResponse.json(
      {
        error: `Untuk versi online, buat maksimal ${maxOnlineRows} tiket sekali proses agar server tidak timeout. Pecah CSV menjadi beberapa batch kecil.`,
      },
      { status: 400 },
    );
  }

  const folder = `${event.id}/${batchFolderName()}`;
  const startCount = await db.ticket.count({ where: { eventId: event.id } });

  let batchId: string | null = null;
  const savedFiles: string[] = [];

  try {
    const batch = await db.generationBatch.create({
      data: {
        eventId: event.id,
        templateId: template.id,
        barcodeType: parsed.data.barcodeType,
        totalTickets: rowsToGenerate.length,
      },
    });
    batchId = batch.id;

    const zip = new JSZip();
    const pdf = await PDFDocument.create();
    const manifestRows = [
      ["ticket_code", "student_name", "class_name", "student_id", "package_name", "parent_name", "phone", "notes", "image_path"].join(","),
    ];
    const createdTickets = [];

    for (const [index, row] of rowsToGenerate.entries()) {
      const ticketCode = formatTicketCode(event.codePrefix, startCount + index + 1);
      const fileName = `${sanitizeFilePart(row.class_name)}-${sanitizeFilePart(row.student_name)}-${ticketCode}.png`;

      const pngBytes = await composeTicketImage({
        templatePath: template.filePath,
        ticketCode,
        studentName: row.student_name,
        placement,
        barcodeType: parsed.data.barcodeType,
      });

      const imagePath = await saveGeneratedFile(`${folder}/${fileName}`, pngBytes, "image/png");
      savedFiles.push(imagePath);
      const ticket = await db.ticket.create({
        data: {
          eventId: event.id,
          templateId: template.id,
          studentName: row.student_name,
          className: row.class_name,
          studentId: row.student_id || null,
          packageName: row.package_name || null,
          parentName: row.parent_name || null,
          phone: row.phone || null,
          notes: row.notes || null,
          ticketCode,
          barcodeType: parsed.data.barcodeType,
          generatedImagePath: imagePath,
          batchId: batch.id,
        },
      });
      createdTickets.push(ticket);

      zip.file(fileName, pngBytes);
      const pdfBytes = await makePdfImage(pngBytes);
      const embedded = await pdf.embedPng(pdfBytes);
      const page = pdf.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      manifestRows.push(
        [
          ticketCode,
          row.student_name,
          row.class_name,
          row.student_id,
          row.package_name,
          row.parent_name,
          row.phone,
          row.notes,
          imagePath,
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const manifestPath = await saveGeneratedFile(`${folder}/manifest.csv`, Buffer.from(manifestRows.join("\n")), "text/csv; charset=utf-8");
    savedFiles.push(manifestPath);
    const zipPath = await saveGeneratedFile(`${folder}/tickets.zip`, await zip.generateAsync({ type: "nodebuffer" }), "application/zip");
    savedFiles.push(zipPath);
    const pdfPath = await saveGeneratedFile(`${folder}/tickets.pdf`, Buffer.from(await pdf.save()), "application/pdf");
    savedFiles.push(pdfPath);

    const updatedBatch = await db.generationBatch.update({
      where: { id: batch.id },
      data: {
        manifestPath,
        zipPath,
        pdfPath,
      },
    });

    return NextResponse.json({ batch: updatedBatch, tickets: createdTickets, skippedRows });
  } catch (error) {
    if (batchId) {
      await db.ticket.deleteMany({ where: { batchId } }).catch(() => undefined);
      await db.generationBatch.deleteMany({ where: { id: batchId } }).catch(() => undefined);
    }
    await Promise.allSettled(savedFiles.map((filePath) => deleteStoredFile(filePath)));
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Tiket belum berhasil dibuat: ${error.message}`
            : "Tiket belum berhasil dibuat. Coba ulangi sebentar lagi.",
      },
      { status: 500 },
    );
  }
}
