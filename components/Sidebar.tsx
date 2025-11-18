// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, FolderOpenDot, Search, Inbox, Star } from "lucide-react";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/anbefalt", label: "Anbefalt", icon: Sparkles },
  { href: "/app/postlister", label: "Postlister", icon: FolderOpenDot },
  { href: "/app/sok", label: "Søk", icon: Search },
  { href: "/app/innsyn", label: "Innsyn-kurv", icon: Inbox },
  { href: "/app/favoritter", label: "Favoritter", icon: Star },
  { href: "/app/arbeidsliv", label: "Arbeidsliv", icon: FolderOpenDot },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 h-full border-r border-[var(--border)] bg-[var(--bg)] text-[var(--text)]">
      <nav className="p-3 w-full">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)] px-2 mb-2">Verktøy</div>
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    active ? "bg-[var(--pill)] border-[var(--accent)]" : "border-[var(--border)] hover:bg-[var(--pill)]"
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
