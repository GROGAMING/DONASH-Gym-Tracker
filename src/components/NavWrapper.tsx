"use client";

import { usePathname } from "next/navigation";
import HamburgerMenu from "./HamburgerMenu";

export default function NavWrapper() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname.startsWith("/upload")) return null;
  return <HamburgerMenu />;
}
