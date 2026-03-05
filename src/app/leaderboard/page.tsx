import LeaderboardScreen from "@/components/LeaderboardScreen";
import RequirePlayer from "@/components/RequirePlayer";

export default function LeaderboardPage() {
  return (
    <RequirePlayer>
      <LeaderboardScreen teamName="Gym Tracker" />
    </RequirePlayer>
  );
}
