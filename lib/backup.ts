import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { appRoot, generatedRoot, publicRoot, templateUploadDir } from "./files";

const dbPath = path.join(appRoot, "prisma", "dev.db");
const allowedRestoreRoots = [path.join(appRoot, "prisma"), templateUploadDir, generatedRoot];

async function addPathToZip(zip: JSZip, absolutePath: string, zipPrefix: string) {
  const entryStat = await stat(absolutePath).catch(() => null);
  if (!entryStat) return;

  if (entryStat.isDirectory()) {
    const entries = await readdir(absolutePath);
    for (const entry of entries) {
      await addPathToZip(zip, path.join(absolutePath, entry), path.posix.join(zipPrefix, entry));
    }
    return;
  }

  if (entryStat.isFile()) {
    zip.file(zipPrefix, await readFile(absolutePath));
  }
}

export async function createBackupZip() {
  const zip = new JSZip();
  zip.file("backup-manifest.json", JSON.stringify({ app: "School Photo Ticket Studio", createdAt: new Date().toISOString() }, null, 2));
  await addPathToZip(zip, dbPath, "prisma/dev.db");
  await addPathToZip(zip, templateUploadDir, "public/uploads/templates");
  await addPathToZip(zip, generatedRoot, "public/generated");
  return zip.generateAsync({ type: "nodebuffer" });
}

function resolveRestorePath(relativePath: string) {
  const normalized = relativePath.split("\\").join("/");
  if (normalized === "backup-manifest.json" || normalized.endsWith("/")) return null;
  if (normalized !== "prisma/dev.db" && !normalized.startsWith("public/uploads/templates/") && !normalized.startsWith("public/generated/")) {
    throw new Error(`File backup tidak didukung: ${relativePath}`);
  }
  const absolute = path.resolve(appRoot, normalized);
  const allowed = allowedRestoreRoots.some((root) => absolute === root || absolute.startsWith(`${root}${path.sep}`));
  if (!allowed || !absolute.startsWith(appRoot)) {
    throw new Error("Backup berisi path tidak aman.");
  }
  return absolute;
}

export async function restoreBackupZip(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  await mkdir(path.dirname(dbPath), { recursive: true });
  await mkdir(templateUploadDir, { recursive: true });
  await mkdir(generatedRoot, { recursive: true });

  const hasDb = Boolean(zip.file("prisma/dev.db"));
  if (hasDb) {
    await rm(dbPath, { force: true }).catch(() => undefined);
  }

  let restored = 0;
  for (const [relativePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const absolute = resolveRestorePath(relativePath);
    if (!absolute) continue;
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, await entry.async("nodebuffer"));
    restored += 1;
  }

  return { restored };
}

export function backupFileName() {
  return `school-photo-ticket-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`;
}
