import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urenlijst",
  description: "Uren bijhouden per werklocatie",
  appleWebApp: { capable: true, title: "Urenlijst", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // extend under the notch / home indicator; we pad with safe-area insets
  themeColor: "#f7f6f2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
