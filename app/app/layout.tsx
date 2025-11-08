// app/(app)/layout.tsx
import "@/app/globals.css";
import { ReactNode, Fragment } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Fragment>
      <Topbar />
      <div className="flex h-[calc(100dvh-var(--header-h))]">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-[var(--bg)] text-[var(--text)]">
          {children}
        </main>
      </div>
    </Fragment>
  );
}
