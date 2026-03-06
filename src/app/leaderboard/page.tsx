import LeaderboardScreen from "@/components/LeaderboardScreen";
import RequirePlayer from "@/components/RequirePlayer";
import { TEAM_NAME } from "@/lib/team";

export default function LeaderboardPage() {
  return (
    <RequirePlayer>
      <LeaderboardScreen teamName={TEAM_NAME} />
    </RequirePlayer>
  );
}
