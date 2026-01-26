import Link from "next/link";

export default function DoomScrollPage() {
  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui", textAlign: "center" }}>
      <h1>Doom Scroll</h1>
      <p style={{ fontSize: "1.1rem", color: "#666", margin: "16px 0" }}>
        Temporarily disabled to reduce bandwidth. Check back soon.
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: 24 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            border: "1px solid #ccc",
            borderRadius: 4,
            textDecoration: "none",
            color: "#000"
          }}
        >
          Upload
        </Link>
        <Link
          href="/leaderboard"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            border: "1px solid #ccc",
            borderRadius: 4,
            textDecoration: "none",
            color: "#000"
          }}
        >
          Leaderboard
        </Link>
      </div>
    </main>
  );
}
