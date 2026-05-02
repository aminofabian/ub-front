import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TenantHostSync } from "@/components/tenant-host-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UB Admin — Phase 1",
  description: "Tenant admin: business, users, and catalog (Slice 6 scaffold).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TenantHostSync />
        {children}
      </body>
    </html>
  );
}
