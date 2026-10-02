export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Countdown({ until, now, total }: { until: number; now: number; total?: number }) {
  // useNow tickt nur sekündlich – nie mehr als die Gesamtzeit anzeigen
  const remaining = total ? Math.min(until - now, total) : until - now;
  const urgent = remaining < 60_000;
  return (
    <span className={`countdown ${urgent ? 'urgent' : ''}`}>
      ⏱ {formatRemaining(remaining)}
      {total ? <span className="bar" style={{ width: `${Math.max(0, Math.min(100, (remaining / total) * 100))}%` }} /> : null}
    </span>
  );
}
