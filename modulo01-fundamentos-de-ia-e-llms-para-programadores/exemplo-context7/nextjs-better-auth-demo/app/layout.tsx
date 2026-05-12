import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js + Better Auth Demo",
  description: "Demo de autenticação com GitHub OAuth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
