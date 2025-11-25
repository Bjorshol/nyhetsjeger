// app/profile/page.tsx
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 12 }}>Min profil</h1>

      <p style={{ marginBottom: 16 }}>
        Her kommer profilsiden senere. Foreløpig er dette bare en placeholder.
      </p>

      <Link href="/app" className="button">
        Tilbake til Nyhetsjeger
      </Link>
    </main>
  );
}
