import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Photo Ticket Studio",
  description: "Generate dan scan tiket photoshoot sekolah secara lokal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
