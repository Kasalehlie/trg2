import { describe, it, expect } from "vitest";
import { slugify, normalizeStatType, normalizeStatValue } from "../scripts/lib/transform.mjs";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("XR International I")).toBe("xr-international-i");
  });
  it("strips punctuation and collapses dashes", () => {
    expect(slugify("Portland & 82nd")).toBe("portland-82nd");
  });
});

describe("normalizeStatType", () => {
  it("maps drifted names to canonical", () => {
    expect(normalizeStatType("year Completed")).toBe("yearCompleted");
    expect(normalizeStatType("year Started")).toBe("yearStarted");
    expect(normalizeStatType("Location")).toBe("location");
    expect(normalizeStatType("type")).toBe("projectType");
  });
  it("passes through already-canonical names", () => {
    expect(normalizeStatType("units")).toBe("units");
    expect(normalizeStatType("squareFeet")).toBe("squareFeet");
  });
});

describe("normalizeStatValue", () => {
  it("normalizes status", () => {
    expect(normalizeStatValue("status", "Construction")).toBe("Under Construction");
    expect(normalizeStatValue("status", "Completed")).toBe("Completed");
  });
  it("uppercases trailing state code in location", () => {
    expect(normalizeStatValue("location", "Salt Lake City, Ut")).toBe("Salt Lake City, UT");
  });
  it("trims other values", () => {
    expect(normalizeStatValue("units", " 240 ")).toBe("240");
  });
});
