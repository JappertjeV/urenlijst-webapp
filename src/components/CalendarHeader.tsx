type Props = {
  title: string;
  view: "week" | "month";
  onPrev: () => void;
  onNext: () => void;
  onView: (v: "week" | "month") => void;
  onAdd: () => void;
  canAdd: boolean;
};

export function CalendarHeader({
  title, view, onPrev, onNext, onView, onAdd, canAdd,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button aria-label="Vorige" onClick={onPrev}
          className="h-8 w-8 rounded-md border border-surface-line">‹</button>
        <span className="text-lg font-medium">{title}</span>
        <button aria-label="Volgende" onClick={onNext}
          className="h-8 w-8 rounded-md border border-surface-line">›</button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-surface-line text-sm">
          {(["month", "week"] as const).map((v) => (
            <button key={v} onClick={() => onView(v)}
              className={view === v ? "bg-surface-soft px-3 py-1.5" : "px-3 py-1.5 text-ink-soft"}>
              {v === "month" ? "Maand" : "Week"}
            </button>
          ))}
        </div>
        {canAdd && (
          <button onClick={onAdd}
            className="rounded-md border border-surface-line px-3 py-1.5 text-sm">+ Uren</button>
        )}
      </div>
    </div>
  );
}
