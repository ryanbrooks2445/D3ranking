import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = Stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const subId = session.subscription as string | null;
        if (!customerId) break;

        const status = session.payment_status === "paid" ? "active" : "trialing";
        await prisma.proSubscription.upsert({
          where: { stripeCustomerId: customerId },
          create: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            status,
          },
          update: {
            stripeSubscriptionId: subId,
            status,
          },
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status ?? "canceled";

        await prisma.proSubscription.upsert({
          where: { stripeCustomerId: customerId },
          create: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            status,
          },
          update: {
            stripeSubscriptionId: sub.id,
            status,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const subId = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
        if (!customerId) break;
        const normalizedSubId =
          typeof subId === "string"
            ? subId
            : subId && typeof subId === "object" && "id" in subId
              ? String(subId.id)
              : null;

        await prisma.proSubscription.upsert({
          where: { stripeCustomerId: customerId },
          create: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: normalizedSubId,
            status: "past_due",
          },
          update: {
            stripeSubscriptionId: normalizedSubId,
            status: "past_due",
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const subId = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
        if (!customerId) break;
        const normalizedSubId =
          typeof subId === "string"
            ? subId
            : subId && typeof subId === "object" && "id" in subId
              ? String(subId.id)
              : null;

        await prisma.proSubscription.upsert({
          where: { stripeCustomerId: customerId },
          create: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: normalizedSubId,
            status: "active",
          },
          update: {
            stripeSubscriptionId: normalizedSubId,
            status: "active",
          },
        });
        break;
      }

      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const subId = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
        if (!customerId) break;
        const normalizedSubId =
          typeof subId === "string"
            ? subId
            : subId && typeof subId === "object" && "id" in subId
              ? String(subId.id)
              : null;

        // Customer must come on-session to authenticate (3DS/SCA). Keep access
        // non-active until they complete payment in hosted invoice/portal.
        await prisma.proSubscription.upsert({
          where: { stripeCustomerId: customerId },
          create: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: normalizedSubId,
            status: "past_due",
          },
          update: {
            stripeSubscriptionId: normalizedSubId,
            status: "past_due",
          },
        });
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
