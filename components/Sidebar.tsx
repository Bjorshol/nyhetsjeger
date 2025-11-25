// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Sparkles,
  FolderOpenDot,
  Search,
  Inbox,
  Star,
  Briefcase,
} from "lucide-react";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/anbefalt", label: "Anbefalt", icon: Sparkles },
  { href: "/app/postlister", label: "Postlister", icon: FolderOpenDot },
  { href: "/app/sok", label: "Søk", icon: Search },
  { href: "/app/innsyn", label: "Innsyn-kurv", icon: Inbox },
  { href: "/app/favoritter", label: "Favoritter", icon: Star },
  { href: "/app/arbeidsliv", label: "Arbeidsliv", icon: Briefcase },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[250px] shrink-0 h-full border-r border-[var(--border)] bg-[var(--bg)] text-[var(--text)]">
      <nav className="p-4 w-full">
        
        {/* Seksjonstittel */}
        <div className="px-2 mb-3 text-[11px] tracking-wide uppercase text-[var(--muted)]">
          Verktøy
        </div>

        <ul className="space-y-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 
                    border 
                    ${active
                      ? "bg-[var(--pill)] border-[var(--accent)] shadow-sm"
                      : "border-[var(--border)] hover:bg-[var(--pill)] hover:border-[var(--accent)]/40"
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

      </nav>
    </aside>
  );
}
