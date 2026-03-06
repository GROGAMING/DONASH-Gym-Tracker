"use client";

import { usePathname } from "next/navigation";
import HamburgerMenu from "./HamburgerMenu";

export default function NavWrapperClient({ teamName }: { teamName: string }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/select-player")) return null;
  return <HamburgerMenu teamName={teamName} />;
}
