export function EmptyState({ title, body }: { title: string; body?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-slate-700 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {body && <div className="mt-1 text-sm text-slate-500">{body}</div>}
    </div>
  );
}
