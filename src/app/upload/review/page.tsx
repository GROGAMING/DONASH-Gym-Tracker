import UploadReviewScreen from "@/components/UploadReviewScreen";
import RequirePlayer from "@/components/RequirePlayer";
import { TEAM_NAME } from "@/lib/team";

export default function UploadReviewPage() {
  return (
    <RequirePlayer>
      <UploadReviewScreen teamName={TEAM_NAME} />
    </RequirePlayer>
  );
}
