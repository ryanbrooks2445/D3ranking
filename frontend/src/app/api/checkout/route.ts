import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { isProPlan, type ProPlan } from "@/lib/billing";

function getPriceId(plan: ProPlan): { envVar: string; priceId: string | undefined } {
  switch (plan) {
    case "monthly":
      return { envVar: "STRIPE_PRICE_ID_MONTHLY", priceId: process.env.STRIPE_PRICE_ID_MONTHLY };
    case "yearly":
      return { envVar: "STRIPE_PRICE_ID_YEARLY", priceId: process.env.STRIPE_PRICE_ID_YEARLY };
    default: {
      const unreachable: never = plan;
      throw new Error(`Unknown plan: ${String(unreachable)}`);
    }
  }
}

/** Create a Stripe Checkout Session for a Pro subscription. Body: { plan: "monthly" | "yearly" }. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const plan = (body as { plan?: unknown }).plan;
  if (!isProPlan(plan)) {
    return NextResponse.json({ error: 'Choose a plan: "monthly" or "yearly".' }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const { envVar, priceId } = getPriceId(plan);

  if (!secretKey || !priceId) {
    const missing = [];
    if (!secretKey) missing.push("STRIPE_SECRET_KEY");
    if (!priceId) missing.push(envVar);
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
      // Collect stronger billing details to improve issuer trust/authorization.
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      // Ensure Checkout always collects and stores a reusable payment method
      // for off-session renewals.
      payment_method_collection: "always",
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
        plan,
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
