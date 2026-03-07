import { getCompositeScoreExplanation } from "@/lib/compositeScore";

export function CompositeScoreExplainer({ sportCode }: { sportCode: string }) {
  const text = getCompositeScoreExplanation(sportCode);

  return (
    <section
      className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3 text-sm text-slate-300"
      aria-label="How composite score is calculated"
    >
      <p className="font-semibold text-slate-200 mb-1">What is the composite score?</p>
      <p className="leading-relaxed">{text}</p>
    </section>
  );
}
