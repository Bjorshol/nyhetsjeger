// components/Topbar.tsx
"use client";

import Link from "next/link";
import { Menu, Settings, User } from "lucide-react";
import { useState } from "react";

export function Topbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="
        sticky top-0 z-40 h-[var(--header-h)]
        border-b border-[var(--border)]
        bg-[#05070d]/95
        backdrop-blur-sm
        text-[var(--text)]
        shadow-sm
      "
    >
      <div className="h-full max-w-7xl mx-auto px-3 md:px-5 flex items-center justify-between gap-3">
        {/* Venstre side: logo + mobilmeny */}
        <div className="flex items-center gap-3">
          {/* Mobil: hamburgermeny */}
          <button
            className="
              md:hidden inline-flex items-center justify-center
              rounded-xl border border-[var(--border)]
              bg-[var(--pill)]
              px-2.5 py-1.5
              hover:border-[var(--accent)]/60
              hover:bg-[var(--pill)]/90
              transition-all duration-150
            "
            onClick={() => setOpen((v) => !v)}
            aria-label="Åpne meny"
          >
            <Menu size={18} />
          </button>

          {/* Brand */}
          <Link
            href="/app"
            className="flex items-center gap-2 group"
          >
            <span className="text-lg font-semibold tracking-tight">
              Nyhetsjeger
            </span>
            <span
              className="
                text-[11px] uppercase tracking-wide
                px-2 py-0.5 rounded-full
                border border-[var(--border)]
                bg-[var(--pill)]
                text-[var(--muted)]
                group-hover:border-[var(--accent)]/70
                group-hover:text-[var(--accent)]
                transition
              "
            >
              Beta
            </span>
          </Link>
        </div>

        {/* Høyre side: knapper */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/profile"
            className="
              inline-flex items-center gap-2
              rounded-xl
              px-3.5 py-1.5
              text-sm font-medium
              border border-[var(--border)]
              bg-[var(--pill)]
              hover:border-[var(--accent)]/70
              hover:bg-[var(--pill)]/95
              transition-all duration-150
              shadow-sm
            "
          >
            <User size={16} />
            <span>Min profil</span>
          </Link>

          <Link
            href="/settings"
            className="
              inline-flex items-center gap-2
              rounded-xl
              px-3.5 py-1.5
              text-sm font-medium
              border border-[var(--accent)]
              bg-[var(--accent)]/10
              hover:bg-[var(--accent)]/18
              transition-all duration-150
            "
          >
            <Settings size={16} />
            <span>Innstillinger</span>
          </Link>
        </nav>
      </div>

      {/* Enkel mobil-dropdown når menyen er åpen */}
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]">
          <nav className="px-3 py-2 flex flex-col gap-1 text-sm">
            <Link
              href="/app"
              className="px-3 py-1.5 rounded-lg hover:bg-[var(--pill)] transition"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/app/anbefalt"
              className="px-3 py-1.5 rounded-lg hover:bg-[var(--pill)] transition"
              onClick={() => setOpen(false)}
            >
              Anbefalt
            </Link>
            <Link
              href="/app/postlister"
              className="px-3 py-1.5 rounded-lg hover:bg-[var(--pill)] transition"
              onClick={() => setOpen(false)}
            >
              Postlister
            </Link>
            <Link
              href="/app/arbeidsliv"
              className="px-3 py-1.5 rounded-lg hover:bg-[var(--pill)] transition"
              onClick={() => setOpen(false)}
            >
              Arbeidsliv
            </Link>
            <Link
              href="/profile"
              className="px-3 py-1.5 rounded-lg hover:bg-[var(--pill)] transition"
              onClick={() => setOpen(false)}
            >
              Min profil
            </Link>
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-lg hover:bg-[var(--pill)] transition"
              onClick={() => setOpen(false)}
            >
              Innstillinger
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
