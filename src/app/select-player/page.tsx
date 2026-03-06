import { TEAM_NAME } from "@/lib/team";
import SelectPlayerClient from "@/components/SelectPlayerClient";

export default function SelectPlayerPage() {
  return <SelectPlayerClient teamName={TEAM_NAME} />;
}
