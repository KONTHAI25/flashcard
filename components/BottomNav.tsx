"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Decks", icon: "📚" },
  { href: "/study", label: "Study", icon: "🧠" },
  { href: "/quiz", label: "Quiz", icon: "❓" },
] as const;

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-800 bg-slate-900/95 backdrop-blur supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? path === "/"
              : path.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
                active
                  ? "text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
