import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GutSenseTelemetryPageView from "@/components/GutSenseTelemetryPageView";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GutSense - FODMAP Food Analysis",
  description: "AI-powered IBS and FODMAP food analysis using multi-agent synthesis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white" suppressHydrationWarning>
        <GutSenseTelemetryPageView />
        {children}
      </body>
    </html>
  );
}
