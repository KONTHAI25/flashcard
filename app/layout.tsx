import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { ToastHost } from "@/components/Toast";

export const metadata: Metadata = {
  title: {
    default: "Flashcards",
    template: "%s | Flashcards",
  },
  description: "Mobile-first spaced repetition flashcards",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
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
      <body className="min-h-dvh text-slate-900 antialiased">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Header />
        <ToastHost />
        <main id="main-content" tabIndex={-1} className="app-main">
          {children}
        </main>
      </body>
    </html>
  );
}
