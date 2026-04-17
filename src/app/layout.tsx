import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Housing Configurator",
  description:
    "Configure your prefab timber home from Easy Housing — Uganda.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
