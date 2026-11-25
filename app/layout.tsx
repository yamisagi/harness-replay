import type { ReactNode } from "react";
import { fontMono, fontSans } from "@/src/lib/fonts";
import { siteMetadata } from "@/src/lib/metadata";
import "./globals.css";

export const metadata = siteMetadata;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable} dark`}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
