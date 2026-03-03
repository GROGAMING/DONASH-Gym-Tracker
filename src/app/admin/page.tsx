import { cookies } from "next/headers";
import AdminScreen from "@/components/AdminScreen";

export default function AdminHome() {
  const authed = cookies().get("admin_authed")?.value === "1";

  return <AdminScreen teamName="Gym Tracker" authed={authed} />;
}
