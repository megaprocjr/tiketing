import { nanoid } from "nanoid";

export function formatTicketCode(prefix: string, sequence: number) {
  const safePrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-");
  const number = String(sequence).padStart(6, "0");
  const random = nanoid(4).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `${safePrefix}-${number}-${random}`;
}
