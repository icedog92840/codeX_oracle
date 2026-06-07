import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db/connection";
import { apiUsage } from "@/lib/db/schema";
import type { ExternalDataSource } from "@/lib/external-data/types";

// ApiBudgetPolicy defines local request ceilings for one provider.
export type ApiBudgetPolicy = {
  maxPerDay: number;
  maxPerMinute: number;
  provider: ExternalDataSource;
};

// ApiBudgetState stores local request counts by day and minute.
type ApiBudgetState = {
  day: string;
  dayCount: number;
  minute: string;
  minuteCount: number;
};

// assertApiBudget increments local counters and throws before crossing configured free-tier limits.
export async function assertApiBudget(policy: ApiBudgetPolicy) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const minute = now.toISOString().slice(0, 16);
  const state = await readBudgetState(policy.provider);
  const nextState: ApiBudgetState = {
    day,
    dayCount: state.day === day ? state.dayCount : 0,
    minute,
    minuteCount: state.minute === minute ? state.minuteCount : 0,
  };

  if (nextState.dayCount >= policy.maxPerDay) {
    throw new Error(`${policy.provider} daily API budget reached. Cached data will be used until the budget resets.`);
  }

  if (nextState.minuteCount >= policy.maxPerMinute) {
    throw new Error(`${policy.provider} per-minute API budget reached. Wait briefly before requesting more uncached data.`);
  }

  nextState.dayCount += 1;
  nextState.minuteCount += 1;
  await writeBudgetState(policy.provider, nextState);
}

// readBudgetState loads provider request counters from the local data folder.
async function readBudgetState(provider: ExternalDataSource): Promise<ApiBudgetState> {
  try {
    const row = getDatabase().select().from(apiUsage).where(eq(apiUsage.provider, provider)).get();

    if (!row) {
      return {
        day: "",
        dayCount: 0,
        minute: "",
        minuteCount: 0,
      };
    }

    return {
      day: row.day,
      dayCount: row.dayCount,
      minute: row.minute,
      minuteCount: row.minuteCount,
    };
  } catch {
    return {
      day: "",
      dayCount: 0,
      minute: "",
      minuteCount: 0,
    };
  }
}

// writeBudgetState persists provider request counters locally.
async function writeBudgetState(provider: ExternalDataSource, state: ApiBudgetState) {
  getDatabase()
    .insert(apiUsage)
    .values({
      day: state.day,
      dayCount: state.dayCount,
      minute: state.minute,
      minuteCount: state.minuteCount,
      provider,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      set: {
        day: state.day,
        dayCount: state.dayCount,
        minute: state.minute,
        minuteCount: state.minuteCount,
        updatedAt: new Date().toISOString(),
      },
      target: apiUsage.provider,
    })
    .run();
}
