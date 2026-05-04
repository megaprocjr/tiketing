import Papa from "papaparse";
import { csvRowSchema } from "./validations";

export type CsvStudentRow = {
  student_name: string;
  class_name: string;
  student_id?: string;
  package_name?: string;
  parent_name?: string;
  phone?: string;
  notes?: string;
};

export type CsvValidationResult = {
  rows: CsvStudentRow[];
  errors: { row: number; message: string }[];
};

export function validateCsvRows(input: unknown[]): CsvValidationResult {
  const rows: CsvStudentRow[] = [];
  const errors: { row: number; message: string }[] = [];

  if (input.length > 2000) {
    errors.push({ row: 0, message: "Maksimal 2000 baris untuk MVP." });
  }

  input.slice(0, 2000).forEach((raw, index) => {
    const parsed = csvRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: index + 2,
        message: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
      return;
    }
    rows.push(parsed.data);
  });

  return { rows, errors };
}

export function parseCsvText(text: string): CsvValidationResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const baseErrors = parsed.errors.map((error) => ({
    row: error.row ? error.row + 1 : 0,
    message: error.message,
  }));
  const result = validateCsvRows(parsed.data);
  return { rows: result.rows, errors: [...baseErrors, ...result.errors] };
}
