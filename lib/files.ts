import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const appRoot = process.cwd();
export const publicRoot = path.join(appRoot, "public");
export const templateUploadDir = path.join(publicRoot, "uploads", "templates");
export const generatedRoot = path.join(publicRoot, "generated");
export const previewDir = path.join(generatedRoot, "previews");

export function sanitizeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90) || "file";
}

export function toPublicPath(absolutePath: string) {
  const relative = path.relative(publicRoot, absolutePath).split(path.sep).join("/");
  return `/${relative}`;
}

export function publicPathToAbsolute(filePath: string) {
  const clean = filePath.replace(/^\/+/, "");
  const absolute = path.resolve(publicRoot, clean);
  if (!absolute.startsWith(publicRoot)) {
    throw new Error("Path file tidak aman.");
  }
  return absolute;
}

export async function ensureLocalDirs() {
  await mkdir(templateUploadDir, { recursive: true });
  await mkdir(previewDir, { recursive: true });
  await mkdir(generatedRoot, { recursive: true });
}

export async function saveBufferSafe(directory: string, fileName: string, buffer: Buffer) {
  const safeName = sanitizeFilePart(fileName);
  const targetDir = path.resolve(directory);
  const target = path.resolve(targetDir, safeName);
  if (!target.startsWith(targetDir)) {
    throw new Error("Nama file tidak aman.");
  }
  await mkdir(targetDir, { recursive: true });
  await writeFile(target, buffer);
  return target;
}

export function batchFolderName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `batch-${stamp}`;
}
