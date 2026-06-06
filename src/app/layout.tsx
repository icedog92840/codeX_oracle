import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

// Primary UI font for labels, navigation, and dense dashboard copy.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Monospace number font so decimals align in financial columns.
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Page metadata shown by the browser and search previews.
export const metadata: Metadata = {
  title: "codeX Oracle",
  description: "A compact local financial portfolio dashboard.",
};

// Root layout wraps every route with the shared app chrome and font variables.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
