"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Your library", icon: "library" },
  { href: "/study", label: "Flashcards", icon: "cards" },
  { href: "/quiz", label: "Practice quiz", icon: "quiz" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) => href === "/" ? pathname === "/" || pathname.startsWith("/deck/") : pathname.startsWith(href);
  const navigation = links.map(link => <Link key={link.href} href={link.href} className={`shell-nav-link ${active(link.href) ? "shell-nav-active" : ""}`} aria-current={active(link.href) ? "page" : undefined}><Icon name={link.icon} /><span>{link.label}</span></Link>);
  return <>
    <header className="topbar">
      <Link href="/" aria-label="Flashcards home" className="wordmark"><span className="brand-mark" aria-hidden="true">f<span>✦</span></span><span>Flashcards</span></Link>
      <form className="global-search" role="search" onSubmit={event => {
        event.preventDefault();
        const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        router.push(query ? `/?q=${encodeURIComponent(query)}` : "/");
      }}>
        <Icon name="search" /><input name="q" type="search" aria-label="Search your study sets" placeholder="Search your study sets" autoComplete="off" /><button type="submit" aria-label="Search"><Icon name="arrow" width="18" height="18" /></button>
      </form>
      <Link href="/?new=1" className="header-create"><Icon name="plus" width="18" height="18" /><span>Create</span></Link>
    </header>
    <aside className="sidebar">
      <nav aria-label="Primary">{navigation}</nav>
      <div className="sidebar-divider" />
      <p className="sidebar-label">YOUR WORKSPACE</p>
      <Link href="/?new=1" className="sidebar-create"><span><Icon name="plus" width="18" height="18" /></span>Create a study set</Link>
      <div className="sidebar-note"><Icon name="cards" width="28" height="28" /><p>A little practice.<br /><strong>A lot of possibility.</strong></p></div>
    </aside>
    <nav className="mobile-nav" aria-label="Primary">{navigation}</nav>
  </>;
}
