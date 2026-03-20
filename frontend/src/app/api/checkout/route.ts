import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";

/** Create a Stripe Checkout Session for Pro subscription. */
export async function POST() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secretKey || !priceId) {
    const missing = [];
    if (!secretKey) missing.push("STRIPE_SECRET_KEY");
    if (!priceId) missing.push("STRIPE_PRICE_ID");
    return NextResponse.json(
      {
        error: `Checkout not configured: add ${missing.join(" and ")} to frontend/.env or .env.local (no quotes), then restart the dev server.`,
      },
      { status: 500 }
    );
  }

  const session = await auth();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const stripe = new Stripe(secretKey);

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#pricing`,
      client_reference_id: session?.user?.id ?? undefined,
      metadata: {
        product: "d3_pro",
      },
      // 7-day free trial (Stripe UI often hides this on Prices; set here so Checkout matches site copy)
      subscription_data: {
        trial_period_days: 7,
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
