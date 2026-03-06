import RequirePlayer from "@/components/RequirePlayer";
import PlayerSessionDetailScreen from "@/components/PlayerSessionDetailScreen";
import { TEAM_NAME } from "@/lib/team";

export default async function SessionDetailPage({ params }: { params: { weeklySessionId: string } }) {
  return (
    <RequirePlayer>
      <PlayerSessionDetailScreen teamName={TEAM_NAME} weeklySessionId={params.weeklySessionId} />
    </RequirePlayer>
  );
}
