// app/app/innsyn/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type InnsynRow = {
  id: string;
  user_id: string;
  type: "postjournal" | "job_applicants" | "job_hired" | string;
  source: string | null;
  source_entry_id: number | string | null;
  etat: string | null;
  recipient_email: string | null;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  status:
    | "draft"
    | "queued"
    | "sent"
    | "answered"
    | "rejected"
    | "closed"
    | string;
  outcome: "unknown" | "full" | "denied" | "story" | null;
  remind_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const fmtDateTime = (v: string | null) => {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return "—";
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
};

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return "—";
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

// enkel html-escape
const esc = (s: unknown) => {
  const str = (s ?? "").toString();
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

function typeLabel(t: InnsynRow["type"]) {
  if (t === "postjournal") return "Postjournal";
  if (t === "job_applicants") return "Søkerliste – stilling";
  if (t === "job_hired") return "Hvem fikk jobben";
  return t || "Ukjent";
}

function sourceLabel(s: string | null) {
  if (!s) return "—";
  if (s === "postjournal") return "Postjournal";
  if (s === "webcruiter") return "Webcruiter";
  return s;
}

// rød/grønn boks "Sendt"/"Besvart"
function statusPill(r: InnsynRow) {
  const isAnswered =
    r.status === "answered" || r.status === "closed" || r.status === "rejected";

  const text = isAnswered ? "Besvart" : "Ikke besvart";
  const bg = isAnswered ? "rgba(34,197,94,0.16)" : "rgba(248,113,113,0.16)";
  const border = isAnswered ? "#22c55e55" : "#f8717155";
  const color = isAnswered ? "#bbf7d0" : "#fecaca";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color,
        minWidth: 120,
        textAlign: "center",
      }}
    >
      {text}
    </span>
  );
}

// outcome-valgene i databasen → norsk tekst
const OUTCOME_OPTIONS: { value: InnsynRow["outcome"]; label: string }[] = [
  { value: "unknown", label: "– ikke satt –" },
  { value: "full", label: "Innsyn" },
  { value: "denied", label: "Avslag" },
  { value: "story", label: "Resulterte i sak" },
];

export default function Page() {
  // auth
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
      setUserId(user.id ?? null);

      if (!profile?.approved) {
        location.replace("/pending");
        return;
      }
      setCheckingAuth(false);
    })();
  }, []);

  // ui state
  const [rows, setRows] = useState<InnsynRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"nyeste" | "eldste">("nyeste");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [savingOutcomeId, setSavingOutcomeId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null); // 🔹

  const headerRef = useRef<HTMLElement | null>(null);

  // sticky thead under topbar
  useEffect(() => {
    const el = headerRef.current as HTMLElement | null;
    const setVar = () => {
      const h = el?.offsetHeight ?? 64;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    if (el) ro.observe(el);
    window.addEventListener("resize", setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, []);

  // load data
  const load = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("innsyn_requests")
        .select(
          "id, user_id, type, source, source_entry_id, etat, recipient_email, subject, body, sent_at, status, outcome, remind_at, created_at, updated_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as InnsynRow[]);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Ukjent feil");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAuth && userId) {
      load();
    }
  }, [checkingAuth, userId]);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortMode === "nyeste" ? tb - ta : ta - tb;
    });
    return list;
  }, [rows, sortMode]);

  const toggleOpen = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleOutcomeChange(
    row: InnsynRow,
    value: InnsynRow["outcome"]
  ) {
    if (!row.id) return;
    setSavingOutcomeId(row.id);
    try {
      const { error } = await supabase
        .from("innsyn_requests")
        .update({ outcome: value })
        .eq("id", row.id);
      if (error) throw error;

      setRows(prev =>
        prev.map(r =>
          r.id === row.id
            ? {
                ...r,
                outcome: value,
              }
            : r
        )
      );
    } catch (e) {
      console.error(e);
      alert("Klarte ikke å oppdatere resultat.");
    } finally {
      setSavingOutcomeId(null);
    }
  }

  // 🔹 OPPDATERT: bruk supabase.functions.invoke("send_innsyn")
  // 🔹 NY: send innsyn via direkte fetch til Edge Function
// 🔹 REN, RIKTIG versjon: bruk Supabase Functions SDK
// 🔹 REN OG RIKTIG: kall edge function slik den heter i Supabase: "send_innsyn_request"
async function handleSend(row: InnsynRow) {
  if (!row.id) return;

  if (!row.recipient_email) {
    alert("Mangler e-postadresse til mottaker.");
    return;
  }

  if (!confirm("Send dette innsynskravet nå?")) return;

  setSendingId(row.id);

  try {
    const { data, error } = await supabase.functions.invoke(
      "send_innsyn_request",
      {
        body: { id: row.id },
      }
    );

    console.log("send_innsyn_request response", { data, error });

    if (error || !data?.ok) {
      throw new Error(
        (error as any)?.message ??
          (data as any)?.error ??
          "Ukjent funksjonsfeil fra edge function"
      );
    }

    // Oppdater lista så sent_at / status blir riktig
    await load();
  } catch (e: any) {
    console.error("handleSend error", e);
    alert(
      `Klarte ikke å sende innsynet.\n\n${
        e?.message || "Se konsollen (F12 → Console) for detaljer."
      }`
    );
  } finally {
    setSendingId(null);
  }
}

  if (checkingAuth) {
    return <main style={{ padding: 40 }}>Laster…</main>;
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .card{ overflow:visible }
            thead th{ position:sticky; top:var(--header-h); z-index:20; background:#0f1522 }
          `,
        }}
      />

      <header ref={headerRef as any}>
        <h1>Nyhetsjeger – Innsynskurv</h1>
        <div className="toolbar">
          <select
            id="sort"
            className="select"
            value={sortMode}
            onChange={e =>
              setSortMode((e.target.value as "nyeste" | "eldste") ?? "nyeste")
            }
            style={{ marginLeft: 8 }}
          >
            <option value="nyeste">Nyeste først</option>
            <option value="eldste">Eldste først</option>
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
                <th>Type</th>
                <th>Virksomhet</th>
                <th>Emne</th>
                <th>Sendt</th>
                <th>Status</th>
                <th>Resultat</th>
                <th className="right">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {errorMsg && (
                <tr>
                  <td colSpan={7} className="empty">
                    Feil: {esc(errorMsg)}
                  </td>
                </tr>
              )}

              {!errorMsg && loading && (
                <tr>
                  <td colSpan={7} className="muted">
                    Laster…
                  </td>
                </tr>
              )}

              {!errorMsg && !loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Ingen innsynskrav enda.
                  </td>
                </tr>
              )}

              {!errorMsg &&
                !loading &&
                sorted.map(r => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="muted">{esc(typeLabel(r.type))}</td>
                      <td>{esc(r.etat ?? "—")}</td>
                      <td>
                        <button
                          className="title-btn"
                          onClick={() => toggleOpen(r.id)}
                        >
                          {esc(r.subject ?? "—")}
                        </button>
                      </td>
                      <td>
                        {esc(
                          r.sent_at ? fmtDateTime(r.sent_at) : "Ikke sendt"
                        )}
                      </td>
                      <td>
                        {statusPill(r)}
                        {(r.status === "draft" || r.status === "queued") && (
                          <div style={{ marginTop: 6 }}>
                            <button
                              className="button"
                              type="button"
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                              }}
                              disabled={sendingId === r.id}
                              onClick={() => handleSend(r)}
                            >
                              {sendingId === r.id ? "Sender…" : "Send innsyn"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          className="select"
                          style={{ padding: "6px 8px", fontSize: 12 }}
                          value={r.outcome ?? "unknown"}
                          disabled={savingOutcomeId === r.id}
                          onChange={e =>
                            handleOutcomeChange(
                              r,
                              e.target.value as InnsynRow["outcome"]
                            )
                          }
                        >
                          {OUTCOME_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value ?? "unknown"}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="right">
                        {esc(r.created_at ? fmtDate(r.created_at) : "—")}
                      </td>
                    </tr>

                    <tr
                      className={openIds.has(r.id) ? "details open" : "details"}
                    >
                      <td colSpan={7}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px 16px",
                          }}
                        >
                          <div>
                            <span className="muted">Type:</span>
                            <br />
                            {esc(typeLabel(r.type))}
                          </div>
                          <div>
                            <span className="muted">Kilde:</span>
                            <br />
                            {esc(sourceLabel(r.source))}
                            {r.source_entry_id
                              ? ` (#${r.source_entry_id})`
                              : ""}
                          </div>
                          <div>
                            <span className="muted">Virksomhet / etat:</span>
                            <br />
                            {esc(r.etat ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Mottaker e-post:</span>
                            <br />
                            {esc(r.recipient_email ?? "—")}
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <span className="muted">E-posttekst:</span>
                            <pre
                              style={{
                                marginTop: 4,
                                background: "#0f1522",
                                borderRadius: 8,
                                padding: 8,
                                fontSize: 12,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {r.body ?? "—"}
                            </pre>
                          </div>
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
