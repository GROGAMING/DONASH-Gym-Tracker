import Link from "next/link";
import { cookies } from "next/headers";

export default function AdminHome() {
  const authed = cookies().get("admin_authed")?.value === "1";

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Admin</h2>
      {!authed ? (
        <p><Link href="/admin/login">Login</Link></p>
      ) : (
        <ul>
          <li><Link href="/admin/uploads">View uploads</Link></li>
          <li><Link href="/admin/report">Weekly PDF report</Link></li>
        </ul>
      )}
    </main>
  );
}
