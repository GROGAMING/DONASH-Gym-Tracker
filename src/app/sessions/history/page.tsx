import RequirePlayer from "@/components/RequirePlayer";
import PlayerSessionHistoryScreen from "@/components/PlayerSessionHistoryScreen";

export default function SessionsHistoryPage() {
  return (
    <RequirePlayer>
      <PlayerSessionHistoryScreen teamName="Gym Tracker" />
    </RequirePlayer>
  );
}
