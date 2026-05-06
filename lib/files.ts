import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { del, put } from "@vercel/blob";

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

export function isRemoteUrl(filePath: string) {
  return /^https?:\/\//i.test(filePath);
}

export function isBlobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isSupabaseStorageEnabled() {
  return Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseStorage() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "ticket-files";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi Supabase Storage belum lengkap.");
  }
  return {
    bucket,
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function putSupabaseFile(filePath: string, buffer: Buffer, contentType: string) {
  const { bucket, client } = supabaseStorage();
  const { error } = await client.storage.from(bucket).upload(filePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Upload Supabase gagal: ${error.message}`);
  }
  const { data } = client.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

function getSupabaseObjectPath(filePath: string) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "ticket-files";
  try {
    const url = new URL(filePath);
    const publicMarker = `/storage/v1/object/public/${bucket}/`;
    const signedMarker = `/storage/v1/object/sign/${bucket}/`;
    const marker = url.pathname.includes(publicMarker) ? publicMarker : signedMarker;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function deleteStoredFile(filePath?: string | null) {
  if (!filePath) return;

  try {
    if (isRemoteUrl(filePath)) {
      if (isSupabaseStorageEnabled()) {
        const objectPath = getSupabaseObjectPath(filePath);
        if (objectPath) {
          const { bucket, client } = supabaseStorage();
          await client.storage.from(bucket).remove([objectPath]);
          return;
        }
      }

      if (isBlobStorageEnabled()) {
        await del(filePath);
      }
      return;
    }

    await unlink(publicPathToAbsolute(filePath));
  } catch {
    // File cleanup is best-effort. The database delete is the source of truth.
  }
}

export async function readStoredFile(filePath: string) {
  if (isRemoteUrl(filePath)) {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error("File online tidak bisa dibaca.");
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return Buffer.from(await readFile(publicPathToAbsolute(filePath)));
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

export async function saveTemplateFile(fileName: string, buffer: Buffer, contentType: string) {
  const safeName = sanitizeFilePart(fileName);
  if (isSupabaseStorageEnabled()) {
    return putSupabaseFile(`templates/${Date.now()}-${safeName}`, buffer, contentType);
  }
  if (isBlobStorageEnabled()) {
    const blob = await put(`templates/${Date.now()}-${safeName}`, buffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }
  const target = await saveBufferSafe(templateUploadDir, safeName, buffer);
  return toPublicPath(target);
}

export async function saveGeneratedFile(relativePath: string, buffer: Buffer, contentType: string) {
  const safePath = relativePath
    .split("/")
    .map((part) => sanitizeFilePart(part))
    .filter(Boolean)
    .join("/");
  if (isSupabaseStorageEnabled()) {
    return putSupabaseFile(`generated/${safePath}`, buffer, contentType);
  }
  if (isBlobStorageEnabled()) {
    const blob = await put(`generated/${safePath}`, buffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }
  const target = path.join(generatedRoot, safePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return toPublicPath(target);
}

export function batchFolderName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `batch-${stamp}`;
}
