import { describe, it, expect } from "vitest";
import { sortByOrder, sortFeaturedFirst, formatNewsDate, toParagraphs } from "../src/utils/contentHelpers.js";

describe("sortByOrder", () => {
  it("sorts ascending by order", () => {
    const out = [{ order: 2 }, { order: 0 }, { order: 1 }].sort(sortByOrder);
    expect(out.map((x) => x.order)).toEqual([0, 1, 2]);
  });
});

describe("sortFeaturedFirst", () => {
  it("keeps featured first, preserves relative order within groups", () => {
    const input = [
      { id: "a", featured: false },
      { id: "b", featured: true },
      { id: "c", featured: false },
      { id: "d", featured: true },
    ];
    expect(sortFeaturedFirst(input).map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("formatNewsDate", () => {
  it("formats ISO date to readable, in UTC", () => {
    expect(formatNewsDate("2022-11-01")).toBe("Nov 1, 2022");
  });
});

describe("toParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(toParagraphs("One.\n\nTwo.")).toEqual(["One.", "Two."]);
  });
  it("returns empty array for empty input", () => {
    expect(toParagraphs("")).toEqual([]);
  });
});
