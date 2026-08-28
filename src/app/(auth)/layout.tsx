import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    default: "Acesso — Labela Semijoias",
    template: "%s | Labela Semijoias",
  },
  description: "Acesse o sistema de gestão Labela Semijoias.",
};

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

