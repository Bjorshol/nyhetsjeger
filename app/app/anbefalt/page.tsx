"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

// ES2020-safe escape (ingen replaceAll)
const esc = (s: unknown) => {
  const str = (s ?? "").toString();
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

// Null-safe kontaktoppslag
function getContactEmail(etat: string | null | undefined): string {
  const name = (etat ?? "").trim();
  if (!name) return "";
  if (CONTACTS[name]) return CONTACTS[name];
  const lower = name.toLowerCase();
  for (const k of Object.keys(CONTACTS)) {
    if (lower.includes(k.toLowerCase())) return CONTACTS[k];
  }
  return "";
}

function buildMailto(r: Row) {
  const to = getContactEmail(r.etat);
  const subject = encodeURIComponent(`Innsyn i dokument – ${(r.saksnr ?? "").toString()}`);
  const body = [
    "Hei,",
    "",
    "Jeg ber med dette om innsyn i dokumentet.",
    `Tittel: ${(r.innhold ?? "").toString()}`,
    `Saksnummer: ${(r.saksnr ?? "").toString()}`,
    `Avsender/mottaker: ${(r.avsmot ?? "").toString()}`,
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

  // sticky thead under header: mål faktisk høyde
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

  // logging: user + session
const [userId, setUserId] = useState<string | null>(null);

// Make the state type explicit so TS is happy
const [sessionId] = useState<string | null>(() => {
  const key = "nj_session_id";
  if (typeof window === "undefined") return null;

  const existing = localStorage.getItem(key);
  if (existing) return existing; // existing is string

  const gen =
    (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // gen is guaranteed string here
  localStorage.setItem(key, gen);
  return gen;
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
    r: Row
  ) {
    if (!userId) return; // enkel og trygg variant
    try {
      await supabase.from("entry_events").insert({
        user_id: userId,
        entry_uid,
        action,
        session_id: sessionId,
        etat: r.etat ?? null,
        innhold: r.innhold ?? null,
        avsmot: r.avsmot ?? null,
        extra: {
          saksnr: r.saksnr ?? null,
          jdato_date: r.jdato_date ?? null,
          kw_score: r.kw_score ?? null,
          source_type: "recommended",
        },
      } as any);
    } catch (e) {
      console.warn("logEvent failed", e);
    }
  }

  const seenDetails = useRef<Set<number>>(new Set());

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
    if (!checkingAuth) load(); // hent først når auth er ok
  }, [checkingAuth]);

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sortMode === "nyeste") {
      list.sort(
        (a, b) =>
          new Date(b.jdato_date ?? "").getTime() -
          new Date(a.jdato_date ?? "").getTime()
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
        <h1>Nyhetsjeger – Anbefalte dokumenter</h1>
        <div className="toolbar">
        

          <select
            id="sort"
            className="select"
            value={sortMode}
            onChange={(e) =>
              setSortMode((e.target.value as "beste" | "nyeste") ?? "beste")
            }
            style={{ marginLeft: 8 }}
          >
            <option value="beste">Beste først (anbefalt)</option>
            <option value="nyeste">Nyeste først</option>
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
                <th>Virksomhet</th>
                <th>Tittel</th>
                <th>Saksnr</th>
                <th className="right">Dato</th>
              </tr>
            </thead>
            <tbody>
              {errorMsg && (
                <tr>
                  <td colSpan={4} className="empty">
                    Feil: {esc(errorMsg)}
                  </td>
                </tr>
              )}

              {!errorMsg && loading && (
                <tr>
                  <td colSpan={4} className="muted">
                    Laster…
                  </td>
                </tr>
              )}

              {!errorMsg && !loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Ingen anbefalinger funnet.
                  </td>
                </tr>
              )}

              {!errorMsg &&
                !loading &&
                sorted.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="muted">{esc(r.etat ?? "—")}</td>
                      <td>
                        <button
                          className="title-btn"
                          onClick={() => {
                            const wasOpen = openIds.has(r.id);
                            toggleOpen(r.id);
                            if (!wasOpen && !seenDetails.current.has(r.id)) {
                              seenDetails.current.add(r.id);
                              logEvent(String(r.id), "view_details", r);
                            }
                          }}
                        >
                          {esc(r.innhold ?? "—")}
                        </button>
                      </td>
                      <td>{esc(r.saksnr ?? "—")}</td>
                      <td className="right">{esc(fmtDate(r.jdato_date))}</td>
                    </tr>

                    <tr
                      className={openIds.has(r.id) ? "details open" : "details"}
                    >
                      <td colSpan={4}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px 16px",
                          }}
                        >
                          <div>
                            <span className="muted">Virksomhet:</span>
                            <br />
                            {esc(r.etat ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Saksnr:</span>
                            <br />
                            {esc(r.saksnr ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Journaldato:</span>
                            <br />
                            {esc(fmtDate(r.jdato_date))}
                          </div>
                          <div>
                            <span className="muted">Tittel:</span>
                            <br />
                            {esc(r.innhold ?? "—")}
                          </div>
                          <div>
                            <span className="muted">Avsender/mottaker:</span>
                            <br />
                            {esc(r.avsmot ?? "—")}
                          </div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <a
                            className="button"
                            href={buildMailto(r)}
                            onClick={() =>
                              logEvent(String(r.id), "click_mailto", r)
                            }
                          >
                            Be om innsyn i dokumentet
                          </a>
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
