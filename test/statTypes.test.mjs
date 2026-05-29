import { describe, it, expect } from "vitest";
import { STAT_TYPES, statTypeByValue } from "../src/config/statTypes.jsx";
import getDisplayName from "../src/utils/getDisplayName.js";

describe("STAT_TYPES", () => {
  it("covers the canonical set", () => {
    expect(STAT_TYPES.map((t) => t.value).sort()).toEqual(
      ["keys", "location", "projectType", "squareFeet", "status", "type", "units", "yearCompleted", "yearStarted"].sort()
    );
  });
  it("every type has a label and icon", () => {
    for (const t of STAT_TYPES) {
      expect(typeof t.label).toBe("string");
      expect(t.icon).toBeTruthy();
    }
  });
});

describe("getDisplayName", () => {
  it("returns canonical labels", () => {
    expect(getDisplayName("yearCompleted")).toBe("Year Completed");
    expect(getDisplayName("projectType")).toBe("Type");
    expect(getDisplayName("squareFeet")).toBe("Square Feet");
  });
  it("falls back to the raw value when unknown", () => {
    expect(getDisplayName("mystery")).toBe("mystery");
  });
});
