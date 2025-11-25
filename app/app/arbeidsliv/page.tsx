// app/arbeidsliv/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase-klient (bruk .env.local og Vercel env)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tilpasset til innherred_recommended_jobs
type JobRow = {
  id: number;
  source: string | null;
  source_job_id: string | null;
  url: string | null;
  title: string | null;
  employer: string | null;
  location: string | null;
  job_category: string | null;
  published_date: string | null;
  deadline_date: string | null;
  // vi bryr oss ikke om resten, men de kan fortsatt komme fra select(*)
  [key: string]: any;
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

// ES2020-safe escape (ingen replaceAll)
const esc = (s: unknown) => {
  const str = (s ?? "").toString();
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

export default function Page() {
  // AUTH-guard
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"nyeste" | "frist">("nyeste");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const headerRef = useRef<HTMLElement | null>(null);

  // sticky thead under header: mål faktisk høyde
  useEffect(() => {
    const el = headerRef.current as HTMLElement | null;
    const setVar = () => {
      const h = el?.offsetHeight ?? 64;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(setVar)
        : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", setVar);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, []);

  // last data
  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("innherred_recommended_jobs")
        .select("*")
        .order("published_date", { ascending: false })
        .limit(250);

      if (error) throw error;
      setRows((data ?? []) as JobRow[]);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Ukjent feil");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAuth) load(); // hent først når auth er ok
  }, [checkingAuth]);

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sortMode === "nyeste") {
      list.sort((a, b) => {
        const ta = a.published_date
          ? new Date(a.published_date).getTime()
          : 0;
        const tb = b.published_date
          ? new Date(b.published_date).getTime()
          : 0;
        return tb - ta; // nyeste først
      });
    } else {
      // sorter etter deadline, tidligste først, men legg stillinger uten frist nederst
      list.sort((a, b) => {
        const ta = a.deadline_date
          ? new Date(a.deadline_date).getTime()
          : Infinity;
        const tb = b.deadline_date
          ? new Date(b.deadline_date).getTime()
          : Infinity;
        return ta - tb;
      });
    }
    return list;
  }, [rows, sortMode]);

  const toggleOpen = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      const wasOpen = next.has(id);
      wasOpen ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Vis lasteskjerm mens vi sjekker auth
  if (checkingAuth) {
    return <main style={{ padding: 40 }}>Laster…</main>;
  }

  return (
    <>
      {/* Liten stil-patch for sticky thead (bruker --header-h) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .card{ overflow:visible }
            thead th{ position:sticky; top:var(--header-h); z-index:20; background:#0f1522 }
          `,
        }}
      />

      <header ref={headerRef as any}>
        <h1>Nyhetsjeger – Anbefalte jobber</h1>
        <div className="toolbar">
          <select
            id="sort"
            className="select"
            value={sortMode}
            onChange={(e) =>
              setSortMode((e.target.value as "nyeste" | "frist") ?? "nyeste")
            }
            style={{ marginLeft: 8 }}
          >
            <option value="nyeste">Nyeste først (anbefalt)</option>
            <option value="frist">Nærmeste søknadsfrist</option>
          </select>

          <button
            className="button"
            onClick={load}
            disabled={loading}
            style={{ marginLeft: 8 }}
          >
            {loading ? "Laster…" : "Oppdater"}
          </button>

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
                <th>Arbeidsgiver</th>
                <th>Stilling</th>
                <th>Sted</th>
                <th>Publisert</th>
                <th className="right">Søknadsfrist</th>
              </tr>
            </thead>
            <tbody>
              {errorMsg && (
                <tr>
                  <td colSpan={5} className="empty">
                    Feil: {esc(errorMsg)}
                  </td>
                </tr>
              )}

              {!errorMsg && loading && (
                <tr>
                  <td colSpan={5} className="muted">
                    Laster…
                  </td>
                </tr>
              )}

              {!errorMsg && !loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Ingen anbefalte jobber funnet.
                  </td>
                </tr>
              )}

              {!errorMsg &&
                !loading &&
                sorted.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="muted">{esc(r.employer ?? "—")}</td>
                      <td>
                        <button
                          className="title-btn"
                          onClick={() => toggleOpen(r.id)}
                        >
                          {esc(r.title ?? "—")}
                        </button>
                      </td>
                      <td>{esc(r.location ?? "—")}</td>
                      <td>{esc(fmtDate(r.published_date))}</td>
                      <td className="right">
                        {esc(
                          r.deadline_date ? fmtDate(r.deadline_date) : "—"
                        )}
                      </td>
                    </tr>

                    <tr
                      className={
                        openIds.has(r.id) ? "details open" : "details"
                      }
                    >
                      <td colSpan={5}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px 16px",
                          }}
                        >
                          <div>
                            <span className="muted">Arbeidsgiver:</span>
                            <br />
                            {esc(r.employer ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Sted:</span>
                            <br />
                            {esc(r.location ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Stillingstittel:</span>
                            <br />
                            {esc(r.title ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Kategori:</span>
                            <br />
                            {esc(r.job_category ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Publisert:</span>
                            <br />
                            {esc(fmtDate(r.published_date))}
                          </div>
                          <div>
                            <span className="muted">Søknadsfrist:</span>
                            <br />
                            {esc(
                              r.deadline_date
                                ? fmtDate(r.deadline_date)
                                : "—"
                            )}
                          </div>
                          <div>
                            <span className="muted">Kilde:</span>
                            <br />
                            {esc(r.source ?? "—")}{" "}
                            {r.source_job_id ? `(#${r.source_job_id})` : ""}
                          </div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          {r.url ? (
                            <a
                              className="button"
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Åpne stillingsannonsen
                            </a>
                          ) : (
                            <span className="muted">
                              Ingen ekstern lenke tilgjengelig.
                            </span>
                          )}
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
