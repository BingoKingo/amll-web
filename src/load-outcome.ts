export type SectionStatus = "applied" | "failed" | "stale" | "skipped";

export type LoadOutcomeStatus = "applied" | "partial" | "stale" | "failed";

export interface LoadOutcome {
  status: LoadOutcomeStatus;
  audioApplied: boolean;
  lyricApplied: boolean;
  coverApplied: boolean;
  audioStatus: SectionStatus;
  lyricStatus: SectionStatus;
  coverStatus: SectionStatus;
}

export function summarizeLoadOutcome(
  audioStatus: SectionStatus,
  lyricStatus: SectionStatus,
  coverStatus: SectionStatus,
  willLoadMedia: boolean,
): LoadOutcomeStatus {
  if (!willLoadMedia) {
    return "applied";
  }

  const statuses = [audioStatus, lyricStatus, coverStatus].filter(
    (status) => status !== "skipped",
  );
  const anyApplied = statuses.some((status) => status === "applied");
  const anyFailed = statuses.some((status) => status === "failed");
  const anyStale = statuses.some((status) => status === "stale");

  if (anyApplied && anyFailed) {
    return "partial";
  }
  if (anyApplied && anyStale) {
    return "partial";
  }
  const allActiveApplied =
    statuses.length > 0 && statuses.every((status) => status === "applied");
  if (allActiveApplied) {
    return "applied";
  }
  if (anyFailed) {
    return "failed";
  }
  if (anyStale) {
    return "stale";
  }
  if (statuses.length === 0) {
    return "applied";
  }
  return "failed";
}

export function shouldSkipGlobalFinalize(outcome: LoadOutcome): boolean {
  return (
    outcome.audioStatus === "stale"
    || outcome.lyricStatus === "stale"
    || outcome.coverStatus === "stale"
  );
}

/** Old URL auto-load must not reset playback when any section was superseded. */
export function shouldApplyAutoLoadPlayback(outcome: LoadOutcome): boolean {
  return outcome.audioApplied && !shouldSkipGlobalFinalize(outcome);
}

export function shouldShowLoadComplete(outcome: LoadOutcome): boolean {
  return outcome.status === "applied";
}

export function buildLoadOutcome(
  audioStatus: SectionStatus,
  lyricStatus: SectionStatus,
  coverStatus: SectionStatus,
  willLoadMedia: boolean,
): LoadOutcome {
  return {
    status: summarizeLoadOutcome(audioStatus, lyricStatus, coverStatus, willLoadMedia),
    audioApplied: audioStatus === "applied",
    lyricApplied: lyricStatus === "applied",
    coverApplied: coverStatus === "applied",
    audioStatus,
    lyricStatus,
    coverStatus,
  };
}
