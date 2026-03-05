import UploadScreen from "@/components/UploadScreen";
import RequirePlayer from "@/components/RequirePlayer";

export default function UploadPage() {
  return (
    <RequirePlayer>
      <UploadScreen teamName="Gym Tracker" />
    </RequirePlayer>
  );
}
