import { cookies } from "next/headers";
import AdminScreen from "@/components/AdminScreen";
import { TEAM_NAME } from "@/lib/team";

export default function AdminHome() {
  const authed = cookies().get("admin_authed")?.value === "1";

  return <AdminScreen teamName={TEAM_NAME} authed={authed} />;
}
