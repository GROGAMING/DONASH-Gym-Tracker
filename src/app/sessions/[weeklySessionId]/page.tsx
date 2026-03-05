import RequirePlayer from "@/components/RequirePlayer";
import PlayerSessionDetailScreen from "@/components/PlayerSessionDetailScreen";

export default async function SessionDetailPage({ params }: { params: { weeklySessionId: string } }) {
  return (
    <RequirePlayer>
      <PlayerSessionDetailScreen teamName="Gym Tracker" weeklySessionId={params.weeklySessionId} />
    </RequirePlayer>
  );
}
