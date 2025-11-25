// app/(app)/layout.tsx
import "@/app/globals.css";
import { ReactNode, Fragment } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Fragment>
      <div className="app-shell">
        <Topbar />

        <div className="flex h-[calc(100dvh-var(--header-h))] bg-[var(--bg)] text-[var(--text)]">
          <div className="shadow-[4px_0_20px_rgba(0,0,0,0.35)] z-20">
            <Sidebar />
          </div>

          <main className="flex-1 overflow-auto px-4 md:px-10 py-6 bg-[var(--bg)]">
            <div className="max-w-5xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </Fragment>
  );
}
