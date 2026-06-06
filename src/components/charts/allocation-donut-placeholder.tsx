import type { AllocationSegment } from "@/lib/types/portfolio";

// AllocationDonutPlaceholder renders a balanced allocation visual using CSS conic gradients.
export function AllocationDonutPlaceholder({ segments }: { segments: AllocationSegment[] }) {
  const allocationSegments = segments.length > 0 ? segments : [{ label: "Cash", value: 100, color: "#64748b" }];
  const gradientStops = allocationSegments
    .map((segment, index) => {
      // Sum earlier segment values to find the current conic-gradient start point.
      const start = allocationSegments
        .slice(0, index)
        .reduce((total, previousSegment) => total + previousSegment.value, 0);
      const end = start + segment.value;

      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="mb-3">
        <h2 className="text-base font-semibold">Allocation</h2>
        <p className="text-xs text-muted-foreground">Sector and cash weighting</p>
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div
          className="relative size-44 rounded-full"
          style={{ background: `conic-gradient(${gradientStops})` }}
          role="img"
          aria-label="Portfolio allocation donut chart"
        >
          <div className="absolute inset-7 rounded-full bg-card shadow-[inset_0_0_28px_rgba(0,0,0,0.24)]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg font-semibold">100%</span>
            <span className="text-xs text-muted-foreground">Allocated</span>
          </div>
        </div>
        <div className="grid w-full gap-2">
          {allocationSegments.map((segment) => (
            <div key={segment.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
              <span className="font-mono">{segment.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
