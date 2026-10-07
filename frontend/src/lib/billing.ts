export type ProPlan = "monthly" | "yearly";

/** Display copy only; amounts are charged from the Stripe Prices in STRIPE_PRICE_ID_MONTHLY / _YEARLY. */
export const PRO_PLANS: Record<ProPlan, { label: string; price: string; interval: string }> = {
  monthly: { label: "Monthly", price: "$5.99", interval: "month" },
  yearly: { label: "Yearly", price: "$19.99", interval: "year" },
};

export const PRO_PRICE_SUMMARY = `${PRO_PLANS.monthly.price}/${PRO_PLANS.monthly.interval} or ${PRO_PLANS.yearly.price}/${PRO_PLANS.yearly.interval}`;

export function isProPlan(value: unknown): value is ProPlan {
  return value === "monthly" || value === "yearly";
}
