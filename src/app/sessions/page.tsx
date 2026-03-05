import RequirePlayer from "@/components/RequirePlayer";
import SessionsScreen from "@/components/SessionsScreen";

export default function SessionsPage() {
  return (
    <RequirePlayer>
      <SessionsScreen teamName="Gym Tracker" />
    </RequirePlayer>
  );
}
