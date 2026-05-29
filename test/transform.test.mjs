import { describe, it, expect } from "vitest";
import { slugify, normalizeStatType, normalizeStatValue } from "../scripts/lib/transform.mjs";
import { projectToRecord, teamToRecord, newsToRecord } from "../scripts/lib/transform.mjs";

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

describe("projectToRecord", () => {
  const raw = {
    id: "13",
    title: "The Charles",
    image: "img.jpg",
    carousel: ["a.jpg", "b.jpg"],
    category: "multi-family",
    stats: [
      { type: "units", text: "240" },
      { type: "year Completed", text: "2022" },
      { type: "status", text: "Completed" },
      { type: "type", text: "Ground Up" },
      { type: "Location", text: "Salt Lake City, Ut" },
    ],
  };
  const rec = projectToRecord(raw, 0);
  it("preserves id and title, adds order + featured", () => {
    expect(rec.id).toBe("13");
    expect(rec.order).toBe(0);
    expect(rec.featured).toBe(false);
  });
  it("normalizes stat types and values", () => {
    expect(rec.stats[1]).toEqual({ type: "yearCompleted", text: "2022" });
    expect(rec.stats[3]).toEqual({ type: "projectType", text: "Ground Up" });
    expect(rec.stats[4]).toEqual({ type: "location", text: "Salt Lake City, UT" });
  });
});

describe("teamToRecord", () => {
  const rec = teamToRecord(
    { name: "Paul Ritchie", title: "Founder", headshot: "h.jpg", linkedin: "url", biop1: "One.", biop2: "Two." },
    2
  );
  it("merges bios into one paragraph string, sets order", () => {
    expect(rec.bio).toBe("One.\n\nTwo.");
    expect(rec.order).toBe(2);
  });
});

describe("newsToRecord", () => {
  const rec = newsToRecord({
    title: "A headline",
    href: "https://x.com",
    category: { name: "Article" },
    description: "desc",
    datetime: "2022-11-01",
    imageUrl: "i.jpg",
    author: { name: "Building Salt Lake" },
  });
  it("flattens to simple fields", () => {
    expect(rec).toEqual({
      title: "A headline",
      link: "https://x.com",
      type: "Article",
      description: "desc",
      image: "i.jpg",
      author: "Building Salt Lake",
      date: "2022-11-01",
    });
  });
});
