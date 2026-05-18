import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  src: [
    { path: "../../public/fonts/Poppins-Light.ttf",    weight: "300", style: "normal" },
    { path: "../../public/fonts/Poppins-Regular.ttf",  weight: "400", style: "normal" },
    { path: "../../public/fonts/Poppins-Medium.ttf",   weight: "500", style: "normal" },
    { path: "../../public/fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/Poppins-Bold.ttf",     weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EH Configurator",
  description: "Design your Easy Housing home.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
