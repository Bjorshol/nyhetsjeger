// app/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Supabase-klient (bruk .env.local og Vercel env)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Row = {
  id: number;
  etat: string | null;
  innhold: string | null;
  saksnr: string | null;
  jdato_date: string | null;
  avsmot: string | null;
  kw_score: number | null;
};

const CONTACTS: Record<string, string> = {
  "Levanger kommune": "postmottak@levanger.kommune.no",
  "Verdal kommune": "postmottak@verdal.kommune.no",
  "Trøndelag fylkeskommune": "postmottak@trondelagfylke.no",
  "Statsforvalteren i Trøndelag": "sftl.post@statsforvalteren.no",
  "Helse Nord-Trøndelag HF": "postmottak@hnt.no",
  "Helse Midt-Norge RHF": "hmn.postmottak@helse-midt.no",
};

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return String(v);
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const esc = (s: unknown) =>
  (s ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function getContactEmail(etat: string | null) {
  if (!etat) return "";
  if (Object.prototype.hasOwnProperty.call(CONTACTS, etat)) return CONTACTS[etat];
  const hit = Object.keys(CONTACTS).find((k) =>
    etat.toLowerCase().includes(k.toLowerCase())
  );
  return hit ? CONTACTS[hit] : "";
}

function buildMailto(r: Row) {
  const to = getContactEmail(r.etat) || "";
  const subject = encodeURIComponent(`Innsyn i dokument – ${r.saksnr ?? ""}`);
  const body = [
    "Hei,",
    "",
    "Jeg ber med dette om innsyn i dokumentet.",
    `Tittel: ${r.innhold ?? ""}`,
    `Saksnummer: ${r.saksnr ?? ""}`,
    `Avsender/mottaker: ${r.avsmot ?? ""}`,
    "",
    "Kravet fremsettes etter offentleglova. Jeg ber om elektronisk innsyn.",
    "",
    "Med vennlig hilsen,",
  ].join("\n");

  return `mailto:${to}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export default function Page() {
  // AUTH-guard
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const u = new URLSearchParams({ redirect: location.pathname });
        location.replace(`/login?${u.toString()}`);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .maybeSingle();

      setUserEmail(user.email ?? null);

      if (!profile?.approved) {
        location.replace("/pending");
        return;
      }
      setCheckingAuth(false);
    })();
  }, []);

  // UI state
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"beste" | "nyeste">("beste");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const headerRef = useRef<HTMLElement | null>(null);

  // sticky thead under header
  useEffect(() => {
    const syncHeaderHeight = () => {
      const h = headerRef.current?.offsetHeight ?? 64;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);
    return () => window.removeEventListener("resize", syncHeaderHeight);
  }, []);

  // last data
  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("recommended_entries")
        .select("id, etat, innhold, saksnr, jdato_date, avsmot, kw_score")
        .order("kw_score", { ascending: false })
        .limit(25);
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Ukjent feil");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAuth) load();
  }, [checkingAuth]);

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sortMode === "nyeste") {
      list.sort(
        (a, b) =>
          new Date(b.jdato_date || 0).getTime() -
          new Date(a.jdato_date || 0).getTime()
      );
    } else {
      list.sort(
        (a, b) =>
          (b.kw_score ?? Number.NEGATIVE_INFINITY) -
          (a.kw_score ?? Number.NEGATIVE_INFINITY)
      );
    }
    return list;
  }, [rows, sortMode]);

  const toggleOpen = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (checkingAuth) {
    return <main style={{ padding: 40 }}>Laster…</main>;
  }

  return (
    <>
      <header ref={headerRef as any}>
        <h1>Nyhetsjeger – Anbefalte dokumenter</h1>
        <div className="toolbar">
          <select
            id="sort"
            className="select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
          >
            <option value="beste">Beste først (anbefalt)</option>
            <option value="nyeste">Nyeste først</option>
          </select>

          <button className="button" onClick={load} disabled={loading}>
            {loading ? "Laster…" : "Oppdater"}
          </button>

          {/* NY KNAPP TIL /postlister */}
          <Link href="/postlister" className="button" style={{ marginLeft: 8 }}>
            Postlister
          </Link>

          {userEmail ? (
            <button
              className="button"
              onClick={async () => {
                await supabase.auth.signOut();
                location.reload();
              }}
              style={{ marginLeft: 8 }}
            >
              Logg ut ({userEmail})
            </button>
          ) : (
            <a className="button" href="/login" style={{ marginLeft: 8 }}>
              Logg inn
            </a>
          )}
        </div>
      </header>

      <main>
        <section className="card">
          <table>
            <thead>
              <tr>
                <th>Virksomhet</th>
                <th>Tittel</th>
                <th>Saksnr</th>
                <th className="right">Dato</th>
              </tr>
            </thead>
            <tbody>
              {errorMsg && (
                <tr>
                  <td colSpan={4} className="empty">Feil: {esc(errorMsg)}</td>
                </tr>
              )}

              {!errorMsg && loading && (
                <tr>
                  <td colSpan={4} className="muted">Laster…</td>
                </tr>
              )}

              {!errorMsg && !loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">Ingen anbefalinger funnet.</td>
                </tr>
              )}

              {!errorMsg && !loading && sorted.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td className="muted">{esc(r.etat ?? "—")}</td>
                    <td>
                      <button className="title-btn" onClick={() => toggleOpen(r.id)}>
                        {esc(r.innhold ?? "—")}
                      </button>
                    </td>
                    <td>{esc(r.saksnr ?? "—")}</td>
                    <td className="right">{esc(fmtDate(r.jdato_date))}</td>
                  </tr>

                  <tr className={openIds.has(r.id) ? "details open" : "details"}>
                    <td colSpan={4}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                        <div><span className="muted">Virksomhet:</span><br />{esc(r.etat ?? "—")}</div>
                        <div><span className="muted">Saksnr:</span><br />{esc(r.saksnr ?? "—")}</div>
                        <div><span className="muted">Journaldato:</span><br />{esc(fmtDate(r.jdato_date))}</div>
                        <div><span className="muted">Tittel:</span><br />{esc(r.innhold ?? "—")}</div>
                        <div><span className="muted">Avsender/mottaker:</span><br />{esc(r.avsmot ?? "—")}</div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <a className="button" href={buildMailto(r)}>Be om innsyn i dokumentet</a>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
