import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: {
    default: "Flashcards",
    template: "%s | Flashcards",
  },
  description: "Mobile-first spaced repetition flashcards",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flashcards",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#020617] text-slate-100 antialiased">
        <main className="mx-auto w-full max-w-xl px-4 pt-5">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
