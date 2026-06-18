import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urenlijst",
  description: "Uren bijhouden per werklocatie",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="min-h-screen">
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
