import Link from "next/link";

export default function Home() {
  return (
    <main className="main">
      <h1>Gym Tracker</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <Link href="/upload" className="btn btn-primary">
          Upload
        </Link>
        <Link href="/leaderboard" className="btn btn-primary">
          Leaderboard
        </Link>
        <Link href="/doom-scroll" className="btn btn-primary">
          Doom Scroll
        </Link>
        <Link href="/admin" className="btn btn-primary">
          Admin
        </Link>
      </div>
    </main>
  );
}
