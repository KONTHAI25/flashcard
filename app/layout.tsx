import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: {
    default: "Flashcards",
    template: "%s | Flashcards",
  },
  description: "Mobile-first spaced repetition flashcards",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flashcards",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F6F7FB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#F6F7FB] text-slate-900 antialiased">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
