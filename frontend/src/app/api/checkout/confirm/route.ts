import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

/**
 * After Stripe redirects here with session_id, verify the session and set the Pro cookie.
 * Also set d3_pro_customer and upsert ProSubscription so isPro() can use DB.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/#pricing", request.url));
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const status = session.payment_status ?? session.status;
    const sub = session.subscription as Stripe.Subscription | undefined;
    const subStatus = sub?.status;

    const paidOrTrialing =
      status === "paid" ||
      subStatus === "active" ||
      subStatus === "trialing";

    if (!paidOrTrialing) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const customerId = session.customer as string | null;
    const subId = session.subscription as string | null;

    if (customerId) {
      try {
        const proStatus = subStatus === "active" || subStatus === "trialing" ? subStatus : "active";
        await prisma.proSubscription.upsert({
          where: { stripeCustomerId: customerId },
          create: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: typeof subId === "string" ? subId : sub?.id ?? null,
            status: proStatus,
          },
          update: {
            stripeSubscriptionId: typeof subId === "string" ? subId : sub?.id ?? null,
            status: proStatus,
          },
        });
      } catch {
        // DB not available (e.g. local with wrong DATABASE_URL) — cookies below still grant Pro
      }
    }

    const res = NextResponse.redirect(new URL("/dashboard", request.url));
    res.cookies.set("d3_pro", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    if (customerId) {
      res.cookies.set("d3_pro_customer", customerId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
    return res;
  } catch {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
