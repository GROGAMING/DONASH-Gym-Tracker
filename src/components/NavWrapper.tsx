"use client";

import { usePathname } from "next/navigation";
import HamburgerMenu from "./HamburgerMenu";

export default function NavWrapper() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <HamburgerMenu />;
}
