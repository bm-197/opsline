import type { Metadata } from "next";
import { EB_Garamond, Geist, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  style: "italic",
  variable: "--font-garamond",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Opsline",
  description:
    "Workflow automation for ops teams. You stop doing the work and start watching it happen.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${garamond.variable} ${geist.variable}`}
    >
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
