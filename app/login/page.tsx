// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function loginWithPassword(e: React.FormEvent) {
  e.preventDefault();
  if (!email || !password) {
    setMsg("Fyll inn e-post og passord.");
    return;
  }
  setLoading(true);
  setMsg("Logger inn …");

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    setLoading(false);
    setMsg(`Feil: ${signInError.message}`);
    return;
  }

  // Cookies kan bruke et øyeblikk – vent litt før getUser()
  await new Promise((r) => setTimeout(r, 150));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    setLoading(false);
    setMsg("Innlogging ser ut til å ha feilet (ingen session). Prøv igjen.");
    return;
  }

  // Hent profile.approved
  const { data: prof, error: profError } = await supabase
    .from("profiles")
    .select("approved")
    .eq("id", user.id)
    .maybeSingle();

  if (profError) {
    setLoading(false);
    setMsg(`Profilfeil: ${profError.message}`);
    return;
  }

  if (!prof) {
    setLoading(false);
    setMsg("Fant ingen profil. Registrer konto først.");
    return;
  }

  if (!prof.approved) {
    setLoading(false);
    setMsg("Kontoen er opprettet, men venter på godkjenning.");
    // Ikke logg ut – la session stå, men brukeren kommer ikke videre.
    return;
  }

  setMsg("Innlogging vellykket. Sender deg videre …");
  router.replace("/feed");
}

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setMsg("Skriv inn e-post først.");
      return;
    }
    setLoading(true);
    setMsg("Sender gjenopprettingslenke …");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    setLoading(false);
    setMsg(error ? `Feil: ${error.message}` : "Sjekk e-posten for lenke til å lage nytt passord.");
  }

  return (
    <main className="mx-auto mt-20 w-full max-w-md px-4">
      <h2 className="mb-6 text-2xl font-semibold">Logg inn</h2>

      <form onSubmit={loginWithPassword} className="mb-4 space-y-3">
        <input
          type="email"
          required
          placeholder="din@epost.no"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-white/20"
          autoComplete="email"
        />
        <input
          type="password"
          required
          placeholder="Passord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-white/20"
          autoComplete="current-password"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 disabled:opacity-50"
          >
            {loading ? "Jobber …" : "Logg inn"}
          </button>
          <a href="/register" className="rounded-xl bg-white/5 px-4 py-2 hover:bg-white/10">
            Registrer
          </a>
        </div>
      </form>

      <form onSubmit={resetPassword}>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white/5 px-4 py-2 hover:bg-white/10 disabled:opacity-50"
        >
          Glemt passord
        </button>
      </form>

      {msg && <p className="mt-3 text-sm text-white/70">{msg}</p>}
    </main>
  );
}
