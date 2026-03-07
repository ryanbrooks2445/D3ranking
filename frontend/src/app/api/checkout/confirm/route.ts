import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * After Stripe redirects here with session_id, verify the session and set the Pro cookie.
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

    const res = NextResponse.redirect(new URL("/dashboard", request.url));
    res.cookies.set("d3_pro", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
