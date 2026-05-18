import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EH Configurator",
  description: "Floor plan configurator from DXF files",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
