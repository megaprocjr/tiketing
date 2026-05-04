import { z } from "zod";

export const barcodeTypes = ["qrcode", "code128", "pdf417"] as const;
export type BarcodeType = (typeof barcodeTypes)[number];

export const eventSchema = z.object({
  name: z.string().trim().min(1, "Nama event wajib diisi."),
  schoolName: z.string().trim().min(1, "Nama sekolah wajib diisi."),
  shootDate: z.string().optional().nullable(),
  codePrefix: z
    .string()
    .trim()
    .min(2, "Prefix kode minimal 2 karakter.")
    .max(32, "Prefix kode maksimal 32 karakter.")
    .regex(/^[A-Z0-9-]+$/i, "Prefix hanya boleh huruf, angka, dan tanda hubung."),
  notes: z.string().trim().max(1000, "Catatan terlalu panjang.").optional().nullable(),
});

export const placementSchema = z.object({
  barcodeType: z.enum(barcodeTypes),
  xPercent: z.coerce.number().min(0).max(100),
  yPercent: z.coerce.number().min(0).max(100),
  widthPercent: z.coerce.number().min(1).max(100),
  heightPercent: z.coerce.number().min(1).max(100),
  rotation: z.coerce.number().min(-180).max(180).default(0),
  foreground: z.string().trim().default("black"),
  background: z.enum(["white", "transparent"]).default("white"),
  showText: z.coerce.boolean().default(false),
  showStudentName: z.coerce.boolean().default(true),
  studentNameBackground: z.enum(["white", "transparent"]).default("white"),
  studentNameOffsetPercent: z.coerce.number().min(-50).max(50).default(1.5),
  studentNameFontPercent: z.coerce.number().min(0.8).max(12).default(3),
});

export const csvRowSchema = z.object({
  student_name: z.string().trim().min(1, "student_name wajib diisi."),
  class_name: z.string().trim().min(1, "class_name wajib diisi."),
  student_id: z.string().trim().optional().default(""),
  package_name: z.string().trim().optional().default(""),
  parent_name: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

export const generateBatchSchema = z.object({
  eventId: z.string().min(1, "Event wajib dipilih."),
  templateId: z.string().min(1, "Template wajib dipilih."),
  barcodeType: z.enum(barcodeTypes),
  duplicateMode: z.enum(["block", "skip"]).default("block"),
  rows: z.array(csvRowSchema).min(1, "CSV belum berisi data siswa.").max(2000, "Maksimal 2000 baris untuk MVP."),
});
