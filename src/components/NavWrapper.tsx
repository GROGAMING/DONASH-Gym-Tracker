import { TEAM_NAME } from "@/lib/team";
import NavWrapperClient from "./NavWrapperClient";

export default function NavWrapper() {
  return <NavWrapperClient teamName={TEAM_NAME} />;
}
