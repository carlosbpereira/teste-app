import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Labela Semijoias — ERP & PDV",
    template: "%s | Labela Semijoias",
  },
  description:
    "Sistema de gestão completo para Labela Semijoias: controle de estoque, PDV, consignação e cobranças.",
  keywords: ["semijoias", "erp", "pdv", "gestão", "estoque", "consignação"],
  authors: [{ name: "Labela Semijoias" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Labela",
  },
};

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased bg-stone-50 text-stone-900 min-h-dvh">
        <div className="flex min-h-dvh">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header */}
            <Header />

            {/* Page content */}
            <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
              {children}
            </main>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </body>
    </html>
  );
}
