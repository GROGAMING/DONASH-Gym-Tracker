import RequirePlayer from "@/components/RequirePlayer";
import PlayerSessionHistoryScreen from "@/components/PlayerSessionHistoryScreen";
import { TEAM_NAME } from "@/lib/team";

export default function SessionsHistoryPage() {
  return (
    <RequirePlayer>
      <PlayerSessionHistoryScreen teamName={TEAM_NAME} />
    </RequirePlayer>
  );
}
