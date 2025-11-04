// app/register/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Hvis allerede innlogget: ikke bli stående her
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Innloggede skal ikke bruke register; send til forsiden
      router.replace("/");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("Oppretter konto …");

    // 1) Opprett auth-bruker
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });

    // Hvis rate limit / confirm-email er aktiv, prøv å logge inn direkte
    if (signUpErr?.message?.toLowerCase().includes("rate limit")
        || signUpErr?.message?.toLowerCase().includes("confirm")) {
      const { error: signInAltErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInAltErr) {
        setMsg(`Feil: ${signUpErr.message}`);
        setLoading(false);
        return;
      }
    } else if (signUpErr) {
      setMsg(`Feil: ${signUpErr.message}`);
      setLoading(false);
      return;
    } else {
      // 2) Normal innlogging etter vellykket signUp
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setMsg(`Feil ved innlogging: ${signInErr.message}`);
        setLoading(false);
        return;
      }
    }

    // 3) Skriv søknadsdata til profiles
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Upsert sikrer at raden finnes, men vi rører IKKE approved
      const { error: upErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            full_name: fullName,
            org,
            purpose
          },
          { onConflict: "id" }
        );
      if (upErr) {
        // Ikke stopp flyten – vi fortsetter å vise beskjed til bruker
        console.error("profiles upsert error:", upErr);
      }
    }

    // 4) Ferdig: vis klar beskjed og send hjem
    setMsg("Takk! Kontoen er opprettet. En administrator må godkjenne deg før du får tilgang. Du får beskjed når alt er klart.");
    setLoading(false);
    setTimeout(() => router.replace("/"), 3500);
  }

  return (
    <main className="mx-auto mt-20 w-full max-w-md px-4">
      <h2 className="mb-6 text-2xl font-semibold">Registrer konto</h2>

      <form onSubmit={handleRegister} className="space-y-3">
        <input
          type="text"
          placeholder="Fullt navn"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-white/20"
        />
        <input
          type="text"
          placeholder="Redaksjon / arbeidsgiver"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-white/20"
        />
        <input
          type="email"
          placeholder="E-postadresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-white/20"
        />
        <input
          type="password"
          placeholder="Velg passord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-white/20"
        />
        <textarea
          placeholder="Kort tekst (formål / behov)"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-white/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50"
        >
          {loading ? "Sender …" : "Send registrering"}
        </button>
      </form>

      {msg && <p className="mt-4 text-sm text-white/70">{msg}</p>}

      <p className="mt-8 text-sm text-white/50">
        Har du allerede en konto?{" "}
        <a href="/login" className="underline hover:text-white/70">
          Logg inn her
        </a>
      </p>
    </main>
  );
}
