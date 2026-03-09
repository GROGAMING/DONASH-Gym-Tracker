import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ManageTeamScreen from "@/components/ManageTeamScreen";
import { TEAM_NAME } from "@/lib/team";

export default function ManageTeamPage() {
  const authed = cookies().get("admin_authed")?.value === "1";
  if (!authed) redirect("/admin/login");
  return <ManageTeamScreen teamName={TEAM_NAME} />;
}
