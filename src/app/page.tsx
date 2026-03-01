import AppShell from "@/components/AppShell";
import MainMenuClient from "@/components/MainMenuClient";

export default function Home() {
  return (
    <AppShell teamName="Gym Tracker">
      <MainMenuClient teamName="Gym Tracker" />
    </AppShell>
  );
}
