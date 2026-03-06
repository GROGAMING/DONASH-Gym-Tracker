import AppShell from "@/components/AppShell";
import MainMenuClient from "@/components/MainMenuClient";
import RequirePlayer from "@/components/RequirePlayer";
import { TEAM_NAME } from "@/lib/team";

export default function Home() {
  return (
    <AppShell teamName={TEAM_NAME}>
      <RequirePlayer>
        <MainMenuClient teamName={TEAM_NAME} />
      </RequirePlayer>
    </AppShell>
  );
}
