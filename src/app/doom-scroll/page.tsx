import DoomScrollScreen from "@/components/DoomScrollScreen";
import RequirePlayer from "@/components/RequirePlayer";
import { TEAM_NAME } from "@/lib/team";

export default function DoomScrollPage() {
  return (
    <RequirePlayer>
      <DoomScrollScreen teamName={TEAM_NAME} />
    </RequirePlayer>
  );
}
