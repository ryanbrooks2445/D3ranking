import { redirect } from "next/navigation";
import { DEFAULT_SPORT } from "@/lib/nav";

export default function TeamsIndexRedirect() {
  redirect(`/teams/${DEFAULT_SPORT}`);
}
