import { db } from "./db";

export async function ensureSampleEvent() {
  const count = await db.event.count();
  if (count > 0) return;
  await db.event.create({
    data: {
      name: "Photoshoot Sekolah Demo",
      schoolName: "SD Nusantara",
      shootDate: new Date("2026-05-15T08:00:00.000Z"),
      codePrefix: "SCH-2026",
      notes: "Sample event otomatis untuk mencoba MVP.",
    },
  });
}
