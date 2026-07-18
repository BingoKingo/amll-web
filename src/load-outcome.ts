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
  if (anyApplied) {
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
