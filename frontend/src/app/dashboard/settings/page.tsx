import Link from "next/link";
import { isPro } from "@/lib/auth";
import { CheckoutButton } from "@/components/CheckoutButton";

export const metadata = {
  title: "Settings · D3 Rankings",
  description: "Account and subscription settings",
};

export default async function SettingsPage() {
  const pro = await isPro();

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-slate-400">
          Manage your subscription and billing on our secure Stripe page.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Billing & subscription</h2>
        <p className="mt-2 text-sm text-slate-400">
          Update your payment method, view invoices, or cancel your plan. You’ll be sent to
          Stripe’s customer portal — same security as checkout.
        </p>

        {pro ? (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex w-fit items-center rounded-md bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/40">
              Pro active
            </span>
            <Link
              href="/api/billing/portal"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Manage subscription
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-300">
              You’re on the free tier. Upgrade for full rankings, search, and more after a 7-day
              free trial ($49.99/year).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <CheckoutButton className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
                Try Pro free
              </CheckoutButton>
              <Link
                href="/#pricing"
                className="text-sm font-semibold text-slate-400 underline decoration-slate-600 underline-offset-2 hover:text-white"
              >
                View pricing
              </Link>
            </div>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-slate-500">
        <Link href="/dashboard" className="text-slate-400 hover:text-white">
          ← Back to rankings
        </Link>
      </p>
    </div>
  );
}
