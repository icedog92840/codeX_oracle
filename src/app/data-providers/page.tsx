import { Activity, CheckCircle2, CircleAlert, Database, KeyRound, ShieldCheck, Waves } from "lucide-react";
import { analyzerDataSettings } from "@/lib/analyzer/analyzer-data-settings";
import { getProviderStatuses, type ProviderStatus } from "@/lib/data/provider-status";
import { marketDataSettings } from "@/lib/market-data/market-data-settings";
import { cn } from "@/lib/utils";

// dynamic keeps provider env/cache status current instead of baking it into a build-time page.
export const dynamic = "force-dynamic";

// DataProvidersPage renders the local setup guide and provider status dashboard.
export default function DataProvidersPage() {
  const providers = getProviderStatuses();
  const readyCount = providers.filter((provider) => provider.enabled).length;
  const cacheCount = providers.reduce((total, provider) => total + provider.cacheEntries, 0);
  const freshCacheCount = providers.reduce((total, provider) => total + provider.cacheFreshEntries, 0);
  const firstMissingProvider = providers.find((provider) => !provider.enabled);
  const analyzerMode = analyzerDataSettings.activeSource === "research" ? "Research-first" : "Mock OHLC";

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Data Providers</h1>
          <p className="text-sm text-muted-foreground">Local setup, cache status, and free-tier safety checks</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{readyCount}/{providers.length} configured</p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard icon={ShieldCheck} label="Offline Safe" value="Always" detail="Missing keys disable providers instead of breaking the app." tone="positive" />
        <SummaryCard icon={Database} label="SQLite Cache" value={`${freshCacheCount}/${cacheCount}`} detail="Fresh cached responses are reused before another API call is made." tone="accent" />
        <SummaryCard icon={KeyRound} label="Next Key" value={firstMissingProvider?.missingEnv[0] ?? "Complete"} detail={firstMissingProvider ? firstMissingProvider.label : "All optional providers are configured."} tone={firstMissingProvider ? "warning" : "positive"} />
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Active Data Routing</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">This shows what the app will try first today, before any provider keys are added.</p>
            </div>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">local-first</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <RoutingMetric label="Dashboard prices" value={formatSourceName(marketDataSettings.activeSource)} detail="Current share price and PADI still use the local market-data provider placeholder." />
            <RoutingMetric label="Analyzer candles" value={analyzerMode} detail={`${analyzerDataSettings.candleLookbackDays} daily candles through /api/research first, with mock fallback.`} />
            <RoutingMetric label="Secrets" value="Server only" detail="API keys are read from local env and never sent to browser components." />
          </div>
        </div>

        <div className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
          <div className="flex items-start gap-3">
            <div className="soft-pulse flex size-9 shrink-0 items-center justify-center rounded-xl border bg-[#191929] text-primary">
              <Waves className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold">No-Key Behavior</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Without keys, research endpoints return safely with mock or empty provider sections. Once keys are added, the same routes start filling SQLite cache records.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Local `.env.local` Checklist</h2>
            <p className="mt-1 text-xs text-muted-foreground">Copy `.env.example` to `.env.local`, add only the providers you want, then restart the dev server. Secret values stay server-side and should not be committed.</p>
          </div>
          <span className="rounded-full border bg-[#191929] px-2 py-1 font-mono text-[10px] text-muted-foreground">restart dev server after edits</span>
        </div>

        <div className="mt-3 grid gap-2">
          {providers.map((provider) => (
            <EnvChecklistRow key={provider.provider} provider={provider} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Recommended News Path</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use FMP first with a free key. The app caches ticker news in SQLite, respects local budget guards, and falls back safely if an endpoint is not available on your plan.
            </p>
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">FMP first</span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <MiniMetric label="Now" value="FMP free key" />
          <MiniMetric label="Fallback" value="RSS template" />
          <MiniMetric label="Later" value="Paid data add-ons" />
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {providers.map((provider) => (
          <ProviderCard key={provider.provider} provider={provider} />
        ))}
      </section>
    </div>
  );
}

// SummaryCard renders one compact provider setup metric.
function SummaryCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: typeof ShieldCheck;
  label: string;
  tone: "accent" | "positive" | "warning";
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-2 truncate font-mono text-lg font-semibold",
              tone === "accent" && "text-primary",
              tone === "positive" && "text-emerald-300",
              tone === "warning" && "text-amber-200",
            )}
          >
            {value}
          </p>
        </div>
        <div className="soft-pulse flex size-9 shrink-0 items-center justify-center rounded-xl border bg-[#191929] text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

// EnvChecklistRow renders one provider's required local environment variables.
function EnvChecklistRow({ provider }: { provider: ProviderStatus }) {
  const Icon = provider.enabled ? CheckCircle2 : CircleAlert;

  return (
    <div className="grid gap-2 rounded-xl border bg-[#191929] p-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={cn("size-4 shrink-0", provider.enabled ? "text-emerald-300" : "text-amber-200")} aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{provider.label}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{provider.provider}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {provider.envKeys.map((key) => (
          <span key={key} className={cn("rounded-full border px-2 py-1 font-mono text-[10px]", provider.missingEnv.includes(key) ? "border-amber-200/30 text-amber-200" : "border-emerald-300/30 text-emerald-300")}>
            {key}
          </span>
        ))}
      </div>
      <span className={cn("w-fit rounded-full border px-2 py-1 font-mono text-[10px]", provider.enabled ? "border-emerald-300/30 text-emerald-300" : "border-amber-200/30 text-amber-200")}>
        {provider.enabled ? "Ready" : "Missing"}
      </span>
    </div>
  );
}

// ProviderCard renders detailed status, capabilities, cache, usage, and setup notes.
function ProviderCard({ provider }: { provider: ProviderStatus }) {
  return (
    <article className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{provider.label}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{provider.provider}</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-1 font-mono text-[10px]",
            provider.enabled ? "border-emerald-300/30 text-emerald-300" : "border-amber-200/30 text-amber-200",
          )}
        >
          {provider.enabled ? "Configured" : "Offline"}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">{provider.detail}</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric label="Cache" value={provider.cacheLabel} />
        <MiniMetric label="Fresh/Stale" value={`${provider.cacheFreshEntries}/${provider.cacheStaleEntries}`} />
        <MiniMetric label="Limit" value={provider.quota} />
      </div>

      <div className="mt-3 rounded-xl border bg-[#191929] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">API Budget Guard</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{provider.usageDetail}</p>
          </div>
          <span
            className={cn(
              "rounded-full border px-2 py-1 font-mono text-[10px]",
              provider.usageTone === "positive" && "border-emerald-300/30 text-emerald-300",
              provider.usageTone === "accent" && "border-primary/40 text-primary",
              provider.usageTone === "warning" && "border-amber-200/30 text-amber-200",
            )}
          >
            {provider.usage}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border bg-[#191929] p-3">
        <p className="text-xs font-semibold uppercase text-primary">Unlocks</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {provider.capabilities.map((capability) => (
            <span key={capability} className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground">
              {capability}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{provider.setupNote}</p>
      </div>

      <div className="mt-3 rounded-xl border bg-[#191929] p-3">
        <p className="text-xs font-semibold uppercase text-primary">Future Options</p>
        <div className="mt-2 grid gap-1.5">
          {provider.futureOptions.map((option) => (
            <p key={option} className="text-xs leading-5 text-muted-foreground">
              {option}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

// RoutingMetric renders one active local/live data route on the provider control panel.
function RoutingMetric({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-[#191929] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-mono text-xs font-semibold text-primary">{value}</p>
        </div>
        <Activity className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

// MiniMetric renders one dense provider counter inside a provider card.
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-[#191929] px-2 py-2">
      <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

// formatSourceName converts internal provider ids into compact user-facing labels.
function formatSourceName(value: string) {
  const labels: Record<string, string> = {
    "local-placeholder": "Local placeholder",
    live: "Live provider",
    mock: "Mock",
    research: "Research cache",
  };

  return labels[value] ?? value;
}
