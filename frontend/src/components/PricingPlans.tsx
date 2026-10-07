import { CheckoutButton } from "@/components/CheckoutButton";
import { PRO_PLANS, type ProPlan } from "@/lib/billing";

const PLAN_ORDER: ProPlan[] = ["yearly", "monthly"];

/** Side-by-side Pro plan cards, each starting Stripe Checkout for its plan. */
export function PricingPlans({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {PLAN_ORDER.map((plan) => {
        const p = PRO_PLANS[plan];
        const featured = plan === "yearly";
        return (
          <div
            key={plan}
            className={`flex flex-col rounded-xl border p-5 ${
              featured ? "border-blue-500/60 bg-blue-950/20" : "border-slate-700 bg-slate-900/60"
            }`}
          >
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">{p.label}</span>
            <span className="mt-2 text-3xl font-bold text-white">
              {p.price}
              <span className="text-base font-medium text-slate-400">/{p.interval}</span>
            </span>
            {featured && <span className="mt-1 text-sm text-blue-300">Best value</span>}
            <div className="mt-auto pt-5">
              <CheckoutButton
                plan={plan}
                className={`w-full min-h-[44px] rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition ${
                  featured ? "bg-blue-600 hover:bg-blue-500" : "border border-slate-600 bg-slate-800 hover:bg-slate-700"
                }`}
              >
                Get Pro {p.label}
              </CheckoutButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
