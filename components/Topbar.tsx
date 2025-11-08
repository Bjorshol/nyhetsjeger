// components/Topbar.tsx
"use client";

import Link from "next/link";
import { Menu, Settings, User } from "lucide-react";
import { useState } from "react";

export function Topbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 h-[var(--header-h)] border-b border-[var(--border)] 
                 bg-[linear-gradient(180deg,#0b0e14,#0c121d_60%)] text-[var(--text)]"
    >
      <div className="h-full max-w-7xl mx-auto px-3 md:px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="md:hidden rounded-xl border border-[var(--border)] px-2 py-1"
            onClick={() => setOpen(v => !v)}
            aria-label="Åpne meny"
          >
            <Menu size={18} />
          </button>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Nyhetsjeger
          </Link>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--pill)] px-3 py-1.5
                       border border-[var(--border)] hover:opacity-90 transition"
          >
            <User size={16} />
            <span>Min profil</span>
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--pill)] px-3 py-1.5
                       border border-[var(--border)] hover:opacity-90 transition"
          >
            <Settings size={16} />
            <span>Innstillinger</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
