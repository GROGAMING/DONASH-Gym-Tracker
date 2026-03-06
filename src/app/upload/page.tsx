import UploadScreen from "@/components/UploadScreen";
import RequirePlayer from "@/components/RequirePlayer";
import { TEAM_NAME } from "@/lib/team";

export default function UploadPage() {
  return (
    <RequirePlayer>
      <UploadScreen teamName={TEAM_NAME} />
    </RequirePlayer>
  );
}
