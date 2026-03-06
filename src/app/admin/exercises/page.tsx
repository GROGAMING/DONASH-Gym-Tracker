import { cookies } from "next/headers";

import AdminExercisesScreen from "@/components/AdminExercisesScreen";

export default function AdminExercisesPage() {
  const authed = cookies().get("admin_authed")?.value === "1";

  if (!authed) {
    return <main style={{ padding: 20, fontFamily: "system-ui" }}>Not logged in.</main>;
  }

  return <AdminExercisesScreen teamName="Gym Tracker" />;
}
