import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
    const text = await readFile(getBudgetPath(provider), "utf-8");
    return JSON.parse(text) as ApiBudgetState;
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
  await mkdir(getBudgetRoot(), { recursive: true });
  await writeFile(getBudgetPath(provider), JSON.stringify(state, null, 2));
}

// getBudgetRoot returns the ignored local folder for API budget counters.
function getBudgetRoot() {
  return process.env.CODEX_ORACLE_CACHE_DIR ? join(process.env.CODEX_ORACLE_CACHE_DIR, "api-budget") : join(process.cwd(), ".data", "api-budget");
}

// getBudgetPath maps one provider to its local budget file.
function getBudgetPath(provider: ExternalDataSource) {
  return join(getBudgetRoot(), `${provider}.json`);
}
