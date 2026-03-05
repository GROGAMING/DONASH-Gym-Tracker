import { cookies } from "next/headers";

import AdminSessionsScreen from "@/components/AdminSessionsScreen";

export default function AdminSessionsPage() {
  const authed = cookies().get("admin_authed")?.value === "1";

  if (!authed) {
    return <main style={{ padding: 20, fontFamily: "system-ui" }}>Not logged in.</main>;
  }

  return <AdminSessionsScreen teamName="Gym Tracker" />;
}
