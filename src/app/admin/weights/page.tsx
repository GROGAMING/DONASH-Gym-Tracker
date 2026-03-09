import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_NAME } from "@/lib/team";
import AdminWeightsReportScreen from "@/components/AdminWeightsReportScreen";

export default function AdminWeightsPage() {
  const authed = cookies().get("admin_authed")?.value === "1";
  if (!authed) redirect("/admin/login");

  return <AdminWeightsReportScreen teamName={TEAM_NAME} />;
}
