import type { Metadata } from "next";
import localFont from "next/font/local";

import { QueryProvider } from "@/lib/query/query-provider";
import { AuthProvider } from "@/components/auth/auth-context";
import { Toaster } from "sonner";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "优效营 uxyy",
  description: "小微企业经营智能体平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
