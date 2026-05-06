import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { ensureLocalDirs, isBlobStorageEnabled, isSupabaseStorageEnabled, sanitizeFilePart, saveTemplateFile } from "@/lib/files";

const allowedTypes = new Set(["image/png", "image/jpeg"]);
const maxSize = 12 * 1024 * 1024;
const maxDimension = 5000;

export async function GET() {
  const templates = await db.ticketTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: { placements: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseStorageEnabled() && !isBlobStorageEnabled()) {
      await ensureLocalDirs();
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const name = String(formData.get("name") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File template wajib diunggah." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Desain tiket hanya boleh PNG, JPG, atau JPEG." }, { status: 400 });
    }
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Ukuran file maksimal 12 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "Gambar tidak valid atau rusak." }, { status: 400 });
    }
    if (Math.max(metadata.width, metadata.height) > maxDimension) {
      return NextResponse.json({ error: "Dimensi gambar maksimal 5000 px pada sisi terpanjang." }, { status: 400 });
    }

    const extension = file.type === "image/png" ? ".png" : ".jpg";
    const fileName = `${Date.now()}-${sanitizeFilePart(file.name.replace(/\.[^.]+$/, ""))}${extension}`;
    const filePath = await saveTemplateFile(fileName, buffer, file.type);

    const template = await db.ticketTemplate.create({
      data: {
        name: name || file.name.replace(/\.[^.]+$/, ""),
        originalFileName: file.name,
        mimeType: file.type,
        filePath,
        width: metadata.width,
        height: metadata.height,
        placements: {
          create: {
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
          },
        },
      },
      include: { placements: true },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Desain belum berhasil diupload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
