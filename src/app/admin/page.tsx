import Link from "next/link";
import { cookies } from "next/headers";
import WeeklyQuotaSettings from "@/components/WeeklyQuotaSettingsSimple";

export default function AdminHome() {
  const authed = cookies().get("admin_authed")?.value === "1";

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Admin</h2>
      {!authed ? (
        <p><Link href="/admin/login">Login</Link></p>
      ) : (
        <>
          <WeeklyQuotaSettings />
          <ul style={{ marginTop: "20px" }}>
            <li><Link href="/admin/uploads">View uploads</Link></li>
            <li><Link href="/admin/report">Weekly report</Link></li>
          </ul>
        </>
      )}
    </main>
  );
}
