import { type ReactNode } from "react";

import { UploadFlowProvider } from "@/components/UploadFlowContext";

export default function UploadLayout({ children }: { children: ReactNode }) {
  return <UploadFlowProvider>{children}</UploadFlowProvider>;
}
