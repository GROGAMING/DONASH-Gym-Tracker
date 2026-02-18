import Link from "next/link";

export default function Home() {
  return (
    <main className="main">
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
