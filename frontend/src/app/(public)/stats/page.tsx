import { redirect } from "next/navigation";
import { DEFAULT_SPORT } from "@/lib/nav";

export default function StatsIndexPage() {
  redirect(`/stats/${DEFAULT_SPORT}`);
}
