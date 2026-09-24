import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shariah Quant Terminal",
  description: "High-frequency Shariah-compliant quantitative trading dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-zinc-100 antialiased font-mono min-h-screen selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}