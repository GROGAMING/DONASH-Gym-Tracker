import React from "react";

import { cn } from "@/lib/utils";

export default function PageContainer(
  { children, className }: { children: React.ReactNode; className?: string },
) {
  return (
    <div
      className={cn(
        "w-full mx-auto max-w-screen-sm px-4 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
