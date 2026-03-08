import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/** Use in layout/header to show login state and user email. */
export async function getSessionForHeader() {
  return auth();
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/** True if the current user has an active Pro subscription (cookies + ProSubscription only; no login). */
export async function isPro(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_PREVIEW_PRO === "true") return true;
  const cookieStore = await cookies();
  const customerId = cookieStore.get("d3_pro_customer")?.value;
  if (customerId) {
    try {
      const sub = await prisma.proSubscription.findUnique({
        where: { stripeCustomerId: customerId },
        select: { status: true },
      });
      if (sub && ACTIVE_STATUSES.has(sub.status)) return true;
    } catch {
      // DB not available (e.g. local SQLite URL with Postgres schema) — fall back to cookie only
    }
  }
  return cookieStore.get("d3_pro")?.value === "true";
}

/** Current user id if logged in. */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
