import AppShell from "@/components/AppShell";
import MainMenuClient from "@/components/MainMenuClient";
import RequirePlayer from "@/components/RequirePlayer";

export default function Home() {
  return (
    <AppShell teamName="Gym Tracker">
      <RequirePlayer>
        <MainMenuClient teamName="Gym Tracker" />
      </RequirePlayer>
    </AppShell>
  );
}
