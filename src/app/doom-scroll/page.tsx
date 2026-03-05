import DoomScrollScreen from "@/components/DoomScrollScreen";
import RequirePlayer from "@/components/RequirePlayer";

export default function DoomScrollPage() {
  return (
    <RequirePlayer>
      <DoomScrollScreen teamName="Gym Tracker" />
    </RequirePlayer>
  );
}
