import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/app/anbefalt"
          className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 hover:border-[var(--accent)] transition"
        >
          <h2 className="font-medium text-lg mb-2">Anbefalte dokumenter</h2>
          <p className="text-[var(--muted)] text-sm">
            De mest interessante sakene akkurat nå.
          </p>
        </Link>

        <Link
          href="/app/postlister"
          className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 hover:border-[var(--accent)] transition"
        >
          <h2 className="font-medium text-lg mb-2">Postlister</h2>
          <p className="text-[var(--muted)] text-sm">
            Se alle poster fra kommuner og etater.
          </p>
        </Link>

        <Link
          href="/app/innsyn"
          className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 hover:border-[var(--accent)] transition"
        >
          <h2 className="font-medium text-lg mb-2">Innsyn</h2>
          <p className="text-[var(--muted)] text-sm">
            Oversikt over alle innsynskrav du har sendt.
          </p>
        </Link>
      </div>
    </div>
  );
}
