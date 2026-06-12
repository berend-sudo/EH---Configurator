import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  src: [
    // WOFF2 for the browser (~3× smaller than TTF). The server PDF
    // (src/lib/server/design-pdf.tsx) still uses the .ttf files, which
    // react-pdf's fontkit prefers — keep both in public/fonts.
    { path: "../../public/fonts/Poppins-Light.woff2",    weight: "300", style: "normal" },
    { path: "../../public/fonts/Poppins-Regular.woff2",  weight: "400", style: "normal" },
    { path: "../../public/fonts/Poppins-Medium.woff2",   weight: "500", style: "normal" },
    { path: "../../public/fonts/Poppins-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/Poppins-Bold.woff2",     weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Easy Housing - Configurator",
  description: "Design your Easy Housing home.",
};

// Explicit viewport so the mobile layout fills small phones edge-to-edge and
// the env(safe-area-inset-*) rules in globals.css activate (viewportFit:cover).
// No maximumScale/userScalable — pinch zoom on the configurator is its own
// gesture (PinchZoomCanvas), not browser zoom, and locking it hurts a11y.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#003B2B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
