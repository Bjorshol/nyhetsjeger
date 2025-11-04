"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const [msg, setMsg] = useState("Logger inn…");

  useEffect(() => {
    const run = async () => {
      // Viktig: bytt inn ?code=… til en gyldig sesjon i nettleseren
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        setMsg(`Innlogging feilet: ${error.message}`);
        return;
      }
      // Nå er brukeren logget inn (har session i localStorage)
      window.location.replace("/");
    };
    run();
  }, []);

  return <main style={{ padding: 40 }}>{msg}</main>;
}
