import { describe, it, expect } from "vitest";
import {
  EMOTIONAL_STATES,
  EMOTIONAL_STATE_MAP,
  getEmotionalStateConfig,
  getEmotionalStateIcon,
  getEmotionalStateColor,
  getEmotionalStateIds,
} from "@/lib/constants/emotional-states";
import { Meh } from "lucide-react";

describe("EMOTIONAL_STATES", () => {
  it("has exactly 6 states", () => {
    expect(EMOTIONAL_STATES).toHaveLength(6);
  });

  it("each state has required fields", () => {
    EMOTIONAL_STATES.forEach((state) => {
      expect(state.id).toBeTruthy();
      expect(state.label).toBeTruthy();
      expect(state.icon).toBeDefined();
      expect(state.color).toBeTruthy();
      expect(state.description).toBeTruthy();
    });
  });

  it("contains expected state IDs", () => {
    const ids = EMOTIONAL_STATES.map((s) => s.id);
    expect(ids).toEqual(["calm", "confident", "anxious", "fearful", "fomo", "revenge"]);
  });
});

describe("getEmotionalStateConfig", () => {
  it("returns config for valid state", () => {
    const config = getEmotionalStateConfig("calm");
    expect(config).toBeDefined();
    expect(config!.label).toBe("Calm");
  });

  it("handles uppercase input (case-insensitive)", () => {
    const config = getEmotionalStateConfig("FOMO");
    expect(config).toBeDefined();
    expect(config!.id).toBe("fomo");
  });

  it("returns undefined for unknown state", () => {
    expect(getEmotionalStateConfig("unknown")).toBeUndefined();
  });
});

describe("getEmotionalStateIcon", () => {
  it("returns correct icon for known state", () => {
    const icon = getEmotionalStateIcon("calm");
    expect(icon).toBeDefined();
    expect(icon).not.toBe(Meh);
  });

  it("returns Meh fallback for unknown state", () => {
    expect(getEmotionalStateIcon("nonexistent")).toBe(Meh);
  });
});

describe("getEmotionalStateColor", () => {
  it("returns correct color for known state", () => {
    expect(getEmotionalStateColor("calm")).toBe("text-profit");
  });

  it("returns fallback for unknown state", () => {
    expect(getEmotionalStateColor("nonexistent")).toBe("text-muted-foreground");
  });
});

describe("getEmotionalStateIds", () => {
  it("returns all 6 IDs", () => {
    const ids = getEmotionalStateIds();
    expect(ids).toHaveLength(6);
    expect(ids).toContain("calm");
    expect(ids).toContain("revenge");
  });
});
