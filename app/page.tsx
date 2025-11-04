"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Oppretter Supabase-klient
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LandingPage() {
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Ikke innlogget → vis knappene under
      const { data: p } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .maybeSingle();

      // Send brukeren videre basert på status
      if (p?.approved) {
        location.replace("/feed");
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 520, margin: "80px auto", textAlign: "center", padding: 20 }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 10 }}>Nyhetsjeger</h1>
      <p className="muted" style={{ marginBottom: 30 }}>
        Logg inn eller registrer deg for å få tilgang.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <a className="button" href="/login">Logg inn</a>
        <a className="button" href="/register">Registrer</a>
      </div>
    </main>
  );
}
