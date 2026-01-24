import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 20, maxWidth: 640, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Gym Tracker</h1>
      <ul>
        <li><Link href="/upload">Upload</Link></li>
        <li><Link href="/leaderboard">Leaderboard</Link></li>
        <li><Link href="/doom-scroll">Doom Scroll</Link></li>
        <li><Link href="/admin">Admin</Link></li>
      </ul>
    </main>
  );
}
