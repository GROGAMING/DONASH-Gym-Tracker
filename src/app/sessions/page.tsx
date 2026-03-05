import RequirePlayer from "@/components/RequirePlayer";
import PlayerSessionsListScreen from "@/components/PlayerSessionsListScreen";

export default function SessionsPage() {
  return (
    <RequirePlayer>
      <PlayerSessionsListScreen teamName="Gym Tracker" />
    </RequirePlayer>
  );
}
