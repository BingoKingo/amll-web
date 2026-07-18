/**
 * Run: node --experimental-strip-types templates/amll-web/src/load-outcome.contract.test.mts
 */
import {
  buildLoadOutcome,
  shouldApplyAutoLoadPlayback,
  shouldShowLoadComplete,
  shouldSkipGlobalFinalize,
  summarizeLoadOutcome,
  type SectionStatus,
} from "./load-outcome.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const cases: Array<{
  name: string;
  audio: SectionStatus;
  lyric: SectionStatus;
  cover: SectionStatus;
  willLoadMedia: boolean;
  expected: string;
}> = [
  { name: "all applied", audio: "applied", lyric: "applied", cover: "applied", willLoadMedia: true, expected: "applied" },
  { name: "failed + stale", audio: "failed", lyric: "stale", cover: "skipped", willLoadMedia: true, expected: "failed" },
  { name: "all stale", audio: "stale", lyric: "stale", cover: "stale", willLoadMedia: true, expected: "stale" },
  { name: "applied + stale", audio: "applied", lyric: "stale", cover: "skipped", willLoadMedia: true, expected: "partial" },
  { name: "applied + failed", audio: "applied", lyric: "failed", cover: "skipped", willLoadMedia: true, expected: "partial" },
  { name: "all failed", audio: "failed", lyric: "failed", cover: "failed", willLoadMedia: true, expected: "failed" },
  { name: "all skipped", audio: "skipped", lyric: "skipped", cover: "skipped", willLoadMedia: true, expected: "applied" },
  { name: "no media load", audio: "skipped", lyric: "skipped", cover: "skipped", willLoadMedia: false, expected: "applied" },
];

for (const testCase of cases) {
  const status = summarizeLoadOutcome(
    testCase.audio,
    testCase.lyric,
    testCase.cover,
    testCase.willLoadMedia,
  );
  assert(
    status === testCase.expected,
    `${testCase.name}: expected ${testCase.expected}, got ${status}`,
  );

  const outcome = buildLoadOutcome(
    testCase.audio,
    testCase.lyric,
    testCase.cover,
    testCase.willLoadMedia,
  );
  assert(outcome.status === testCase.expected, `${testCase.name}: buildLoadOutcome mismatch`);
  assert(outcome.audioApplied === (testCase.audio === "applied"), `${testCase.name}: audioApplied`);
  assert(outcome.audioStatus === testCase.audio, `${testCase.name}: audioStatus preserved`);
}

const partialFinalize = buildLoadOutcome("applied", "failed", "skipped", true);
assert(shouldSkipGlobalFinalize(partialFinalize) === false, "applied+failed should finalize");
assert(shouldShowLoadComplete(partialFinalize) === false, "applied+failed is not complete");

const stalePartial = buildLoadOutcome("applied", "stale", "skipped", true);
assert(shouldSkipGlobalFinalize(stalePartial) === true, "applied+stale should skip finalize");
assert(shouldShowLoadComplete(stalePartial) === false, "applied+stale is not complete");
assert(
  shouldApplyAutoLoadPlayback(stalePartial) === false,
  "applied+stale must not drive auto-load playback",
);

const appliedAll = buildLoadOutcome("applied", "applied", "skipped", true);
assert(shouldApplyAutoLoadPlayback(appliedAll) === true, "fully applied audio should autoplay");

console.log("load-outcome contract checks passed");
