type Stat = { label: string; value: string; hint?: string };

/** Quiet number row — the figures are the point of the activity page. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-3 lg:grid-cols-5 [&>div]:bg-surface" style={{ gap: 1 }}>
      {stats.map((s) => (
        <div key={s.label} className="px-5 py-4">
          <dt className="eyebrow">{s.label}</dt>
          <dd className="mt-2 font-serif text-[30px] leading-none tabular-nums">{s.value}</dd>
          {s.hint ? <p className="mt-1.5 text-[11.5px] text-muted-foreground">{s.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}
