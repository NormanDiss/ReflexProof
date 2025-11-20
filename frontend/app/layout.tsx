import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppNavbar } from "@/components/layout/AppNavbar";

export const metadata: Metadata = {
  title: "ReflexProof | FHEVM 手速反应链存证",
  description:
    "ReflexProof 是基于 Zama FHEVM 的手速反应测评平台，支持 Fully Homomorphic Encryption 的成绩上链与可信证书。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="fixed inset-0 -z-20 h-full w-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_50%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.2),transparent_45%)]" />
        <div className="fixed inset-0 -z-10 h-full w-full bg-noise opacity-[0.06] mix-blend-soft-light" />
        <Providers>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pb-16 pt-8 md:px-8">
            <AppNavbar />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
