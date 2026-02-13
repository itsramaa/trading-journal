import { describe, it, expect } from "vitest";
import {
  detectStreakZones,
  detectMilestones,
  type CurveDataPoint,
} from "@/lib/equity-annotations";

function makePoint(overrides: Partial<CurveDataPoint> = {}): CurveDataPoint {
  return {
    date: "2025-01-01",
    balance: 10000,
    drawdown: 0,
    pnl: 100,
    ...overrides,
  };
}

describe("detectStreakZones", () => {
  it("returns empty for insufficient data", () => {
    expect(detectStreakZones([])).toEqual([]);
    expect(detectStreakZones([makePoint()])).toEqual([]);
  });

  it("detects a winning streak of 3+", () => {
    const data: CurveDataPoint[] = [
      makePoint({ date: "2025-01-01", pnl: 100 }),
      makePoint({ date: "2025-01-02", pnl: 50 }),
      makePoint({ date: "2025-01-03", pnl: 200 }),
      makePoint({ date: "2025-01-04", pnl: 150 }),
      makePoint({ date: "2025-01-05", pnl: -100 }),
    ];

    const zones = detectStreakZones(data);
    expect(zones.length).toBe(1);
    expect(zones[0].type).toBe("win");
    expect(zones[0].length).toBe(4);
    expect(zones[0].startIndex).toBe(0);
    expect(zones[0].endIndex).toBe(3);
  });

  it("detects a losing streak of 3+", () => {
    const data: CurveDataPoint[] = [
      makePoint({ pnl: 100 }),
      makePoint({ pnl: -50 }),
      makePoint({ pnl: -30 }),
      makePoint({ pnl: -80 }),
      makePoint({ pnl: 100 }),
    ];

    const zones = detectStreakZones(data);
    expect(zones.length).toBe(1);
    expect(zones[0].type).toBe("loss");
    expect(zones[0].length).toBe(3);
  });

  it("detects multiple streaks", () => {
    const data: CurveDataPoint[] = [
      makePoint({ pnl: 100 }),
      makePoint({ pnl: 100 }),
      makePoint({ pnl: 100 }),
      makePoint({ pnl: -50 }),
      makePoint({ pnl: -50 }),
      makePoint({ pnl: -50 }),
    ];

    const zones = detectStreakZones(data);
    expect(zones.length).toBe(2);
    expect(zones[0].type).toBe("win");
    expect(zones[1].type).toBe("loss");
  });

  it("ignores streaks shorter than 3", () => {
    const data: CurveDataPoint[] = [
      makePoint({ pnl: 100 }),
      makePoint({ pnl: 100 }),
      makePoint({ pnl: -50 }),
      makePoint({ pnl: -50 }),
    ];

    const zones = detectStreakZones(data);
    expect(zones.length).toBe(0);
  });
});

describe("detectMilestones", () => {
  it("returns empty for no data", () => {
    expect(detectMilestones([], 10000)).toEqual([]);
  });

  it("detects ATH milestone", () => {
    const data: CurveDataPoint[] = [
      makePoint({ balance: 10100 }),
      makePoint({ balance: 10500 }),
      makePoint({ balance: 10300 }),
    ];

    const milestones = detectMilestones(data, 10000);
    const ath = milestones.find(m => m.type === "ath");
    expect(ath).toBeDefined();
    expect(ath!.index).toBe(1);
    expect(ath!.value).toBe(10500);
    expect(ath!.label).toBe("ATH");
  });

  it("detects max drawdown milestone", () => {
    const data: CurveDataPoint[] = [
      makePoint({ balance: 10500 }),
      makePoint({ balance: 9500 }),
      makePoint({ balance: 10000 }),
    ];

    const milestones = detectMilestones(data, 10000);
    const maxDd = milestones.find(m => m.type === "max_dd");
    expect(maxDd).toBeDefined();
    expect(maxDd!.index).toBe(1);
    expect(maxDd!.label).toContain("Max DD");
  });

  it("detects break-even recovery", () => {
    const data: CurveDataPoint[] = [
      makePoint({ balance: 9500 }),
      makePoint({ balance: 9800 }),
      makePoint({ balance: 10000 }),
    ];

    const milestones = detectMilestones(data, 10000);
    const breakeven = milestones.find(m => m.type === "breakeven");
    expect(breakeven).toBeDefined();
    expect(breakeven!.index).toBe(2);
  });

  it("does not detect breakeven if never below initial", () => {
    const data: CurveDataPoint[] = [
      makePoint({ balance: 10100 }),
      makePoint({ balance: 10200 }),
    ];

    const milestones = detectMilestones(data, 10000);
    const breakeven = milestones.find(m => m.type === "breakeven");
    expect(breakeven).toBeUndefined();
  });
});
