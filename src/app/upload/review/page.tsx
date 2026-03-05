import UploadReviewScreen from "@/components/UploadReviewScreen";
import RequirePlayer from "@/components/RequirePlayer";

export default function UploadReviewPage() {
  return (
    <RequirePlayer>
      <UploadReviewScreen teamName="Gym Tracker" />
    </RequirePlayer>
  );
}
