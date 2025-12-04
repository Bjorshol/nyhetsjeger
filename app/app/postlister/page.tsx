"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SOURCE = "entries"; // kobling mot entries-tabellen

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
  sak_key?: string | null;
  doknr?: string | null;
  sak_tittel?: string | null;
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
  kind?: string | null; // saksmappe / journalpost
  extra: any;
};

function fmtDateHuman(s?: string | null) {
  if (!s) return "—";
  try {
    const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
    return d.toLocaleDateString("no-NO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return s as string;
  }
}

function esc(s?: string | null) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m]!
      )
  );
}

// saksnøkkel
function getCaseKey(r: Entry): string | null {
  if (r.sak_key) return String(r.sak_key);
  if (r.saksnr) return r.saksnr.split("-")[0];
  return null;
}

function fmtKind(kind?: string | null): string {
  if (kind === "saksmappe") return "Saksmappe";
  if (kind === "journalpost") return "Postjournal";
  if (!kind) return "—";
  return kind;
}

// standard emne / tekst til innsynsforespørselen
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

// nøkkel vi bruker i UI for å markere at noe er lagt i innsynskurven
function requestedKey(source: string, id: number | string | undefined | null) {
  if (id == null) return "";
  return `${source}:${id}`;
}

export default function PostlisterPage() {
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

  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    const k = "nj_session_id";
    if (typeof window === "undefined") return null;
    let v = localStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(k, v);
    }
    return v;
  });

  // hvilke poster er i innsynskurven (for denne brukeren)
  const [requested, setRequested] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      if (user?.id) {
        const { data, error } = await supabase
          .from("innsyn_requests")
          .select("source, source_entry_id, type")
          .eq("user_id", user.id)
          .eq("type", "postjournal"); // vi bruker kun denne typen her

        if (!error && data) {
          const s = new Set<string>();
          for (const row of data as any[]) {
            if (row.source_entry_id != null) {
              s.add(requestedKey(row.source, row.source_entry_id));
            }
          }
          setRequested(s);
        }
      }
    })();
  }, []);

  function isRequested(r: Entry): boolean {
    const key = requestedKey(SOURCE, r.id);
    if (!key) return false;
    return requested.has(key);
  }

  async function logEvent(
    entry_uid: string,
    action: "view_details" | "add_innsyn",
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

  // hovedlista
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
    "uid, id, etat, innhold, saksnr, sak_key, doknr, sak_tittel, jdato, dokdato, source_type, source_url, avsmot, betegnelse, aar, sekvens, tilgangskode, hentet_tid, kind, extra";

  // saker
  const [caseDocs, setCaseDocs] = useState<Record<string, Entry[]>>({});
  const [caseLoading, setCaseLoading] = useState<Record<string, boolean>>({});
  const [caseError, setCaseError] = useState<Record<string, string | null>>({});

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
        query = query.or(
          `etat.ilike.%${term}%,innhold.ilike.%${term}%,saksnr.ilike.%${term}%,sak_tittel.ilike.%${term}%`
        );
      }

      // saksmappene skjules i hovedlista
      query = query.neq("kind", "saksmappe");

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

  async function loadCaseForEntry(r: Entry) {
    const sakKey = getCaseKey(r);
    const etat = r.etat || "";
    if (!sakKey || !etat) return;

    const key = `${etat}::${sakKey}`;

    if (caseDocs[key] || caseLoading[key]) return;

    setCaseLoading((prev) => ({ ...prev, [key]: true }));
    setCaseError((prev) => ({ ...prev, [key]: null }));

    try {
      const { data, error } = await supabase
        .from("entries")
        .select(
          "uid, id, etat, innhold, saksnr, sak_key, doknr, sak_tittel, jdato, dokdato, avsmot, kind"
        )
        .eq("etat", etat)
        .eq("sak_key", sakKey)
        .order("jdato", { ascending: true, nullsFirst: true })
        .order("doknr", { ascending: true, nullsFirst: true });

      if (error) throw error;

      setCaseDocs((prev) => ({
        ...prev,
        [key]: (data as Entry[]) || [],
      }));
    } catch (e: any) {
      console.error("loadCaseForEntry failed", e);
      setCaseError((prev) => ({
        ...prev,
        [key]: e?.message || "Ukjent feil ved henting av saken",
      }));
    } finally {
      setCaseLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sourceType]);

  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setPage(0);
      load();
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const first = useMemo(
    () => Math.min(from + 1, count || 0),
    [from, count]
  );
  const last = useMemo(
    () => Math.min(from + rows.length, count || 0),
    [from, rows.length, count]
  );

  async function addToInnsyn(r: Entry) {
    if (!userId) {
      alert("Du må være innlogget for å bruke innsynslisten.");
      return;
    }

    if (r.id == null) {
      alert("Fant ikke ID på posten.");
      return;
    }

    const sourceEntryId =
      typeof r.id === "number" ? r.id : Number(r.id as any);
    if (Number.isNaN(sourceEntryId)) {
      alert("Ugyldig ID på posten.");
      return;
    }

    const key = requestedKey(SOURCE, sourceEntryId);
    if (!key) return;

    try {
      const row: any = {
        user_id: userId,
        type: "postjournal",
        source: SOURCE,
        source_entry_id: sourceEntryId,
        etat: r.etat,
        // recipient_email kan vi fylle inn senere – null er lov
        subject: buildInnsynSubject(r),
        body: buildInnsynBody(r),
        // status får default 'draft'
      };

      const { error } = await supabase
        .from("innsyn_requests")
        .insert(row);

      if (error) throw error;

      setRequested((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      const entry_uid = String(r.uid ?? r.id ?? "");
      await logEvent(entry_uid, "add_innsyn", r);
    } catch (e: any) {
      console.error("addToInnsyn failed", e?.message || e);
      alert("Klarte ikke å legge til i innsynslisten.");
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <header ref={headerRef as any}>
        <h1>Nyhetsjeger – Postlister</h1>
        <div className="toolbar">
          <a className="button" href="/postlister">
            Postlister
          </a>
          <a className="button" href="/innsyn">
            Innsyn
          </a>

          <input
            className="input"
            type="search"
            placeholder="Søk i tittel, sak eller virksomhet…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="select"
            value={sourceType}
            onChange={(e) => {
              setSourceType(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Alle kilder</option>
            <option value="ec">Kommunale (ElementsCloud)</option>
            <option value="pdf">Helseforetak (PDF)</option>
            <option value="ein">eInnsyn</option>
          </select>
          <select
            className="select"
            value={String(limit)}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10) || 100);
              setPage(0);
            }}
          >
            <option>50</option>
            <option>100</option>
            <option>200</option>
          </select>
          <button
            className="button"
            onClick={() => load()}
            disabled={loading}
          >
            {loading ? "Laster…" : "Oppdater"}
          </button>
        </div>
      </header>

      <main>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th style={{ width: "24%" }}>Virksomhet</th>
                <th style={{ width: "12%" }}>Type</th>
                <th>Tittel</th>
                <th style={{ width: "14%" }}>Saksnr</th>
                <th style={{ width: "14%" }}>Dato</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Laster…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Ingen treff
                  </td>
                </tr>
              ) : (
                rows.flatMap((r) => {
                  const key = (r.uid ?? r.id ?? Math.random()).toString();
                  const dato = r.jdato || r.dokdato || null;
                  const sakKey = getCaseKey(r);
                  const caseStateKey =
                    sakKey && r.etat ? `${r.etat}::${sakKey}` : null;
                  const docs = caseStateKey
                    ? caseDocs[caseStateKey]
                    : undefined;
                  const docsLoading = caseStateKey
                    ? caseLoading[caseStateKey]
                    : false;
                  const docsError = caseStateKey
                    ? caseError[caseStateKey]
                    : null;

                  const caseTitle =
                    (docs &&
                      docs.find((d) => d.sak_tittel)?.sak_tittel) ||
                    r.sak_tittel ||
                    null;

                  const requestedHere = isRequested(r);

                  return [
                    <tr
                      key={key}
                      className="row"
                      onClick={(e) => {
                        const tr =
                          e.currentTarget as HTMLTableRowElement;
                        const open = tr.classList.contains("open");
                        document
                          .querySelectorAll("tbody .row.open")
                          .forEach((el) =>
                            el.classList.remove("open")
                          );
                        if (!open) {
                          tr.classList.add("open");
                          if (!seenDetails.current.has(key)) {
                            seenDetails.current.add(key);
                            const entry_uid = String(
                              r.uid ?? r.id ?? ""
                            );
                            logEvent(entry_uid, "view_details", r);
                          }
                          loadCaseForEntry(r);
                        }
                      }}
                    >
                      <td className="etat">{esc(r.etat || "–")}</td>
                      <td>{esc(fmtKind(r.kind))}</td>
                      <td>
                        <button className="title-btn">
                          {esc(r.innhold || "—")}
                        </button>
                        {r.source_type ? (
                          <span
                            className="pill"
                            style={{ marginLeft: 6 }}
                          >
                            {esc(r.source_type)}
                          </span>
                        ) : null}
                      </td>
                      <td>{esc(r.saksnr || "—")}</td>
                      <td className="right">
                        <span className="muted">
                          {esc(fmtDateHuman(dato))}
                        </span>
                      </td>
                    </tr>,
                    <tr key={`${key}-details`} className="details">
                      <td colSpan={5}>
                        <div className="grid">
                          <div>
                            <span className="muted">
                              Virksomhet:
                            </span>
                            <br />
                            {esc(r.etat || "—")}
                          </div>
                          <div>
                            <span className="muted">Saksnr:</span>
                            <br />
                            {esc(r.saksnr || "—")}
                          </div>
                          <div>
                            <span className="muted">
                              Journaldato:
                            </span>
                            <br />
                            {esc(fmtDateHuman(r.jdato))}
                          </div>
                          <div>
                            <span className="muted">
                              Dok.dato:
                            </span>
                            <br />
                            {esc(fmtDateHuman(r.dokdato))}
                          </div>
                          <div>
                            <span className="muted">
                              Betegnelse:
                            </span>
                            <br />
                            {esc(r.betegnelse || "—")}
                          </div>
                          <div>
                            <span className="muted">
                              Saksnavn:
                            </span>
                            <br />
                            {esc(caseTitle || r.innhold || "—")}
                          </div>
                          <div>
                            <span className="muted">
                              Avsender/Mottaker:
                            </span>
                            <br />
                            {esc(r.avsmot || "—")}
                          </div>
                          <div>
                            <span className="muted">Type:</span>
                            <br />
                            {esc(fmtKind(r.kind))}
                          </div>
                        </div>

                        {sakKey && r.etat && (
                          <div
                            style={{
                              marginTop: 16,
                              paddingTop: 12,
                              borderTop: "1px solid #223044",
                            }}
                          >
                            <span className="muted">
                              Alle postene i denne saken:
                            </span>

                            {docsLoading && (
                              <div className="muted" style={{ marginTop: 6 }}>
                                Laster poster i saken…
                              </div>
                            )}

                            {docsError && (
                              <div
                                className="muted"
                                style={{ marginTop: 6 }}
                              >
                                Feil: {docsError}
                              </div>
                            )}

                            {!docsLoading && docs && docs.length > 0 && (
                              <ul
                                style={{
                                  marginTop: 8,
                                  paddingLeft: 18,
                                  listStyle: "disc",
                                }}
                              >
                                {docs.map((d) => {
                                  const dRequested = isRequested(d);
                                  return (
                                    <li
                                      key={String(d.uid ?? d.id)}
                                      style={{ marginBottom: 6 }}
                                    >
                                      <span className="muted">
                                        {fmtDateHuman(
                                          d.jdato || d.dokdato
                                        )}
                                        {" – "}
                                      </span>
                                      <span>
                                        {d.innhold || "Uten tittel"}
                                      </span>
                                      {d.doknr && (
                                        <span className="muted">
                                          {" "}
                                          (dok.nr. {d.doknr})
                                        </span>
                                      )}
                                      <button
                                        className="button"
                                        style={{
                                          marginLeft: 8,
                                          padding: "2px 8px",
                                          fontSize: 12,
                                        }}
                                        disabled={dRequested}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          if (!dRequested) addToInnsyn(d);
                                        }}
                                      >
                                        {dRequested
                                          ? "Innsynskrav sendt"
                                          : "Legg til i innsynslisten"}
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {!docsLoading &&
                              docs &&
                              docs.length === 0 && (
                                <div
                                  className="muted"
                                  style={{ marginTop: 6 }}
                                >
                                  Fant ingen andre poster i denne saken.
                                </div>
                              )}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            className="button"
                            disabled={requestedHere}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (!requestedHere) addToInnsyn(r);
                            }}
                          >
                            {requestedHere
                              ? "Innsynskrav sendt"
                              : "Legg til i innsynslisten"}
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
            <div>
              {count > 0 ? `${first}–${last} av ${count}` : "–"}
            </div>
            <div>
              <button
                className="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
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
