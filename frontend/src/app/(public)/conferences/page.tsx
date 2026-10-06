import { redirect } from "next/navigation";
import { DEFAULT_SPORT } from "@/lib/nav";

export default function ConferencesIndexRedirect() {
  redirect(`/conferences/${DEFAULT_SPORT}`);
}
