"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m12 2 9 4.9-9 4.9-9-4.9L12 2z" />
      <path d="m3 11.9 9 4.9 9-4.9" />
      <path d="m3 16.9 9 4.9 9-4.9" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

const links = [
  { href: "/", label: "Sets" },
  { href: "/study", label: "Study" },
  { href: "/quiz", label: "Quiz" },
] as const;

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        active
          ? "bg-indigo-50 font-semibold text-[#4255FF]"
          : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex min-h-[64px] items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Flashcards home"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4255FF]"
            >
              <LayersIcon className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Flashcards
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActive(pathname, link.href)}
              />
            ))}
          </nav>

          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#4255FF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3040E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4255FF] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <PlusIcon className="h-4 w-4" />
            Create
          </Link>
        </div>

        <nav
          aria-label="Primary"
          className="flex gap-1 overflow-x-auto pb-3 sm:hidden"
        >
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={isActive(pathname, link.href)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}
