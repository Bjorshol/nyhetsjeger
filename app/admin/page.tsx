"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Profile = {
  id: string;
  full_name: string | null;
  org: string | null;
  email: string | null;
  purpose: string | null;
  approved: boolean | null;
  created_at: string | null;
  is_admin: boolean | null;
};

export default function AdminPage() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [search, setSearch] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { location.replace("/login"); return; }

      const { data: me } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!me?.is_admin) { setMsg("Du har ikke tilgang til denne siden."); setLoading(false); return; }

      setIsAdmin(true);
      await load();

      const ch = supabase
        .channel("profiles-pending")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
        .subscribe();
      return () => supabase.removeChannel(ch);
    })();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,org,email,purpose,approved,created_at,is_admin")
      .or("approved.is.null,approved.eq.false")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) setMsg(`Feil ved lasting: ${error.message}`);
    else setRows(data ?? []);
    setLoading(false);
    setSelected(new Set());
  }

  async function approveOne(id: string) {
    setBusyIds(s => new Set(s).add(id));
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) setMsg(`Feil: ${error.message}`);
    else setRows(list => list.filter(r => r.id !== id));
    setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
  }

  async function approveSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setBusyIds(new Set(ids));
    const { error } = await supabase.from("profiles").update({ approved: true }).in("id", ids);
    if (error) setMsg(`Feil: ${error.message}`);
    await load();
    setBusyIds(new Set());
  }

  function toggleOne(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll(checked: boolean, current: Profile[]) {
    setSelected(checked ? new Set(current.map(r => r.id)) : new Set());
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(p =>
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.org ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.purpose ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (!isAdmin) {
    return (
      <main style={{ padding: 40 }}>
        <h2>Admin</h2>
        <p>{loading ? "Laster…" : (msg || "Du har ikke tilgang.")}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1120, margin: "60px auto", padding: 20 }}>
      <h2>Adminpanel – nye søknader</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <input
          placeholder="Søk i navn, org, e-post, tekst…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 10 }}
        />
        <button className="button" onClick={approveSelected} disabled={selected.size === 0}>
          Godkjenn valgte ({selected.size})
        </button>
        <button className="button" onClick={load}>Oppdater</button>
      </div>

      {msg && <p className="muted" style={{ marginTop: 4 }}>{msg}</p>}

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-check">
                <input
                  type="checkbox"
                  aria-label="Velg alle"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={e => toggleAll(e.target.checked, filtered)}
                />
              </th>
              <th className="w-name">Navn</th>
              <th className="w-org">Org</th>
              <th className="w-email">E-post</th>
              <th>Tekst</th>
              <th className="w-date">Mottatt</th>
              <th className="w-action"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="muted center">Laster…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="center">Ingen nye søknader</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="center">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                  />
                </td>
                <td className="ellipsis">{p.full_name || "—"}{p.is_admin ? " · admin" : ""}</td>
                <td className="ellipsis">{p.org || "—"}</td>
                <td className="ellipsis">{p.email || "—"}</td>
                <td className="ellipsis">{p.purpose || "—"}</td>
                <td className="nowrap">{p.created_at ? new Date(p.created_at).toLocaleDateString("no-NO") : "—"}</td>
                <td className="right">
                  <button
                    className="button"
                    onClick={() => approveOne(p.id)}
                    disabled={busyIds.has(p.id)}
                    style={{ background: "#2d7", color: "black", padding: "6px 12px" }}
                  >
                    {busyIds.has(p.id) ? "…" : "Godkjenn"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* page-local CSS: disables sticky header, fixes widths and ellipsis */}
      <style jsx>{`
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed; /* stable columns */
        }
        .admin-table thead th { 
          position: static;   /* override global sticky */
          border-bottom: 1px solid #2a2a2a;
        }
        .admin-table tbody tr { border-bottom: 1px solid #1f2835; }
        .center { text-align: center; }
        .right { text-align: right; }
        .nowrap { white-space: nowrap; }
        .ellipsis { 
          overflow: hidden; 
          text-overflow: ellipsis; 
          white-space: nowrap; 
        }

        /* widths */
        .w-check  { width: 44px; }
        .w-name   { width: 22%; }
        .w-org    { width: 16%; }
        .w-email  { width: 22%; }
        .w-date   { width: 120px; }
        .w-action { width: 110px; }
      `}</style>
    </main>
  );
}
