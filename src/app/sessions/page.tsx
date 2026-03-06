import RequirePlayer from "@/components/RequirePlayer";
import PlayerSessionsListScreen from "@/components/PlayerSessionsListScreen";
import { TEAM_NAME } from "@/lib/team";

export default function SessionsPage() {
  return (
    <RequirePlayer>
      <PlayerSessionsListScreen teamName={TEAM_NAME} />
    </RequirePlayer>
  );
}
