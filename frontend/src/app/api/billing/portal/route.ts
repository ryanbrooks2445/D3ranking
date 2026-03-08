import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";

/**
 * Create a Stripe Customer Portal session and redirect the user there.
 * They can cancel subscription, update payment method, view invoices.
 * Requires d3_pro_customer cookie (set after checkout).
 */
export async function GET(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const cookieStore = await cookies();
  const customerId = cookieStore.get("d3_pro_customer")?.value;
  if (!customerId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`,
    });

    if (session.url) {
      return NextResponse.redirect(session.url);
    }
  } catch (err) {
    console.error("Billing portal error:", err);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
