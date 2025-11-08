"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const styles = `
:root {
  --bg:#0b0e14; --card:#121826; --muted:#8aa0b6; --text:#e6edf3; --accent:#4ea1ff; --border:#223044; --pill:#1c2536;
  --header-h: 64px;
}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--text)}
header{padding:20px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,#0b0e14,#0c121d 60%);position:sticky;top:0;z-index:10}
h1{margin:0 0 8px;font-size:20px}
.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.input,.select,.button{background:var(--pill);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
.input{min-width:220px}
.button{cursor:pointer}
.button[disabled]{opacity:.5;cursor:default}
main{padding:16px 20px 40px;max-width:1200px;margin:0 auto}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:visible}
table{width:100%;border-collapse:collapse}
thead th{
  text-align:left;font-weight:600;padding:12px 14px;background:#0f1522;color:var(--muted);
  border-bottom:1px solid var(--border);
  position:sticky; top:var(--header-h); z-index:20;
}
tbody tr{border-bottom:1px solid var(--border)}
td{padding:12px 14px;vertical-align:top}
.etat{color:var(--muted);font-weight:600}
.title-btn{appearance:none;border:0;background:none;color:var(--text);text-align:left;cursor:pointer;padding:0;font-size:14px;line-height:1.4}
.title-btn:hover{color:var(--accent);text-decoration:underline}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--pill);border:1px solid var(--border);color:var(--muted);font-size:12px}
.muted{color:var(--muted)}
.right{text-align:right}
.details{background:#0e1421;border-top:1px solid var(--border);padding:12px 14px;display:none}
.row.open + .details{display:table-row}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
.grid div{min-width:0}
.footer{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:12px;border-top:1px solid var(--border);background:#0f1522;color:var(--muted)}
.link{color:var(--accent);text-decoration:none}
.link:hover{text-decoration:underline}
.empty{padding:24px;text-align:center;color:var(--muted)}
`;

type Entry = {
  uid?: string | null;
  id?: number | string;
  etat: string | null;
  innhold: string | null;
  saksnr: string | null;
  jdato: string | null;
  dokdato: string | null;
  source_type: string | null;
  source_url: string | null;
  avsmot: string | null;
  betegnelse: string | null;
  aar: number | null;
  sekvens: number | null;
  tilgangskode: string | null;
  hentet_tid: string | null;
  extra: any;
};

const CONTACTS: Record<string, string> = {
  "Levanger kommune": "postmottak@levanger.kommune.no",
  "Verdal kommune": "postmottak@verdal.kommune.no",
  "Trøndelag fylkeskommune": "postmottak@trondelagfylke.no",
  "Statsforvalteren i Trøndelag": "sftl.post@statsforvalteren.no",
  "Helse Nord-Trøndelag HF": "postmottak@hnt.no",
  "Helse Midt-Norge RHF": "hmn.postmottak@helse-midt.no",
};

function getContactEmail(etat?: string | null) {
  if (!etat) return null;
  return CONTACTS[etat] || null;
}

function encodeRFC3986(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function fmtDateHuman(s?: string | null) {
  if (!s) return "—";
  try {
    const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
    return d.toLocaleDateString("no-NO", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return s as string;
  }
}

function buildInnsynSubject(r: Entry) {
  const etat = r.etat || "virksomheten";
  const saks = r.saksnr ? ` – sak ${r.saksnr}` : "";
  return `Innsyn i dokument${saks} (${etat})`;
}

function buildInnsynBody(r: Entry) {
  return [
    `Hei,`,
    ``,
    `Jeg ber med dette om innsyn i dokument i henhold til offentleglova § 3.`,
    ``,
    `Opplysninger:`,
    `• Virksomhet: ${r.etat || "—"}`,
    `• Saksnummer: ${r.saksnr || "—"}`,
    `• Tittel: ${r.innhold || "—"}`,
    `• Journaldato: ${fmtDateHuman(r.jdato)}`,
    `• Dokumentdato: ${fmtDateHuman(r.dokdato)}`,
    `• Kilde: ${r.source_url || "—"}`,
    ``,
    `Jeg ber om at dokumentet oversendes elektronisk (PDF).`,
    `Ved helt eller delvis avslag ber jeg om hjemmelhenvisning, konkret begrunnelse og opplysning om klagerett og klagefrist, jf. offentleglova §§ 31–32.`,
    ``,
    `Vennlig hilsen`,
    `[Navn]`,
    `[Tlf]`,
  ].join("\n");
}

function buildMailtoHref(r: Entry) {
  const to = getContactEmail(r.etat) || "";
  const subject = encodeRFC3986(buildInnsynSubject(r));
  const body = encodeRFC3986(buildInnsynBody(r));
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

function esc(s?: string | null) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

export default function PostlisterPage() {
  // sticky offset
  const headerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () => {
      const h = el.offsetHeight || 64;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener("resize", setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, []);

  // user + session + logger
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    const k = "nj_session_id";
    if (typeof window === "undefined") return null;
    let v = localStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  async function logEvent(
    entry_uid: string,
    action: "view_details" | "click_mailto",
    r: Entry
  ) {
    if (!userId) return;
    try {
      await supabase.from("entry_events").insert({
        user_id: userId,
        entry_uid,
        action,
        session_id: sessionId,
        etat: r.etat,
        innhold: r.innhold,
        avsmot: r.avsmot,
        extra: {
          saksnr: r.saksnr,
          source_type: r.source_type,
          source_url: r.source_url,
        },
      });
    } catch (e) {
      console.warn("logEvent failed", e);
    }
  }

  const seenDetails = useRef<Set<string>>(new Set());

  // state
  const [q, setQ] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Entry[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<number | undefined>(undefined);

  const from = page * limit;
  const columns =
    "uid, id, etat, innhold, saksnr, jdato, dokdato, source_type, source_url, avsmot, betegnelse, aar, sekvens, tilgangskode, hentet_tid, extra";

  async function load() {
    setLoading(true);
    try {
      let query = supabase
        .from("entries")
        .select(columns, { count: "exact" })
        .order("jdato", { ascending: false, nullsFirst: false })
        .order("hentet_tid", { ascending: false });

      if (sourceType) query = query.eq("source_type", sourceType);
      if (q.trim()) {
        const term = q.trim();
        query = query.or(`etat.ilike.%${term}%,innhold.ilike.%${term}%`);
      }
      query = query.range(from, from + limit - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      setRows((data as Entry[]) || []);
      setCount(count ?? (data?.length || 0));
    } catch (e) {
      console.error(e);
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sourceType]);

  // debounce søk
  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setPage(0);
      load();
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const first = useMemo(() => Math.min(from + 1, count || 0), [from, count]);
  const last = useMemo(() => Math.min(from + rows.length, count || 0), [from, rows.length, count]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <header ref={headerRef as any}>
        <h1>Nyhetsjeger – Postlister</h1>
        <div className="toolbar">
          <a className="button" href="/postlister">Postlister</a>

          <input
            className="input"
            type="search"
            placeholder="Søk i tittel eller virksomhet…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" value={sourceType} onChange={(e) => { setSourceType(e.target.value); setPage(0); }}>
            <option value="">Alle kilder</option>
            <option value="ec">Kommunale (ElementsCloud)</option>
            <option value="pdf">Helseforetak (PDF)</option>
            <option value="ein">eInnsyn</option>
          </select>
          <select
            className="select"
            value={String(limit)}
            onChange={(e) => { setLimit(parseInt(e.target.value, 10) || 100); setPage(0); }}
          >
            <option>50</option>
            <option>100</option>
            <option>200</option>
          </select>
          <button className="button" onClick={() => load()} disabled={loading}>
            {loading ? "Laster…" : "Oppdater"}
          </button>
        </div>
      </header>

      <main>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Virksomhet</th>
                <th>Tittel</th>
                <th style={{ width: "14%" }}>Saksnr</th>
                <th style={{ width: "14%" }}>Dato</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">Laster…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">Ingen treff</td>
                </tr>
              ) : (
                rows.flatMap((r) => {
                  const key = (r.uid ?? r.id ?? Math.random()).toString();
                  const dato = r.jdato || r.dokdato || null;
                  return [
                    <tr
                      key={key}
                      className="row"
                      onClick={(e) => {
                        const tr = e.currentTarget as HTMLTableRowElement;
                        const open = tr.classList.contains("open");
                        document.querySelectorAll("tbody .row.open").forEach((el) => el.classList.remove("open"));
                        if (!open) {
                          tr.classList.add("open");
                          if (!seenDetails.current.has(key)) {
                            seenDetails.current.add(key);
                            logEvent(String(r.uid ?? r.id ?? ""), "view_details", r);
                          }
                        }
                      }}
                    >
                      <td className="etat">{esc(r.etat || "–")}</td>
                      <td>
                        <button className="title-btn">{esc(r.innhold || "—")}</button>
                        {r.source_type ? <span className="pill" style={{ marginLeft: 6 }}>{esc(r.source_type)}</span> : null}
                      </td>
                      <td>{esc(r.saksnr || "—")}</td>
                      <td className="right"><span className="muted">{esc(fmtDateHuman(dato))}</span></td>
                    </tr>,
                    <tr key={`${key}-details`} className="details">
                      <td colSpan={4}>
                        <div className="grid">
                          <div><span className="muted">Virksomhet:</span><br />{esc(r.etat || "—")}</div>
                          <div><span className="muted">Saksnr:</span><br />{esc(r.saksnr || "—")}</div>
                          <div><span className="muted">Journaldato:</span><br />{esc(fmtDateHuman(r.jdato))}</div>
                          <div><span className="muted">Dok.dato:</span><br />{esc(fmtDateHuman(r.dokdato))}</div>
                          <div><span className="muted">Betegnelse:</span><br />{esc(r.betegnelse || "—")}</div>
                          <div><span className="muted">Avsender/Mottaker:</span><br />{esc(r.avsmot || "—")}</div>
                        </div>
                        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {r.source_url ? (
                            <a className="link" href={r.source_url} target="_blank" rel="noopener">Åpne kilde</a>
                          ) : (
                            <span className="muted">Ingen lenke</span>
                          )}
                          <a
                            className="button"
                            href={buildMailtoHref(r)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => logEvent(String(r.uid ?? r.id ?? ""), "click_mailto", r)}
                          >
                            Send innsynskrav
                          </a>
                          <button
                            className="button"
                            onClick={async (ev) => {
                              ev.stopPropagation();
                              const text = buildInnsynBody(r);
                              try {
                                await navigator.clipboard.writeText(text);
                                (ev.currentTarget as HTMLButtonElement).textContent = "Kopiert!";
                                setTimeout(() => ((ev.currentTarget as HTMLButtonElement).textContent = "Kopier innsynstekst"), 1200);
                              } catch {
                                window.prompt("Kopier teksten manuelt (Ctrl/Cmd + C):", text);
                              }
                            }}
                          >
                            Kopier innsynstekst
                          </button>
                        </div>
                      </td>
                    </tr>,
                  ];
                })
              )}
            </tbody>
          </table>

          <div className="footer">
            <div>{count > 0 ? `${first}–${last} av ${count}` : "–"}</div>
            <div>
              <button className="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Forrige
              </button>
              <button
                className="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={last >= count}
                style={{ marginLeft: 8 }}
              >
                Neste
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
