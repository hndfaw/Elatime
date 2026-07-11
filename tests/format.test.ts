import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatTime,
  formatWhen,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  AGE_LABELS,
} from "@/lib/format";

describe("date formatting", () => {
  it("formats a date without throwing", () => {
    expect(formatDate("2026-07-12T15:00:00.000Z")).toMatch(/Jul/);
  });
  it("formats a time", () => {
    expect(formatTime("2026-07-12T15:00:00.000Z")).toMatch(/\d/);
  });
  it("handles invalid dates gracefully", () => {
    expect(formatDate("nope")).toBe("Date TBD");
    expect(formatTime("nope")).toBe("");
  });
  it("combines date and time in formatWhen", () => {
    const s = formatWhen("2026-07-12T15:00:00.000Z", "2026-07-12T16:00:00.000Z");
    expect(s).toContain("·");
    expect(s).toContain("–");
  });
  it("omits the range when no end is given", () => {
    const s = formatWhen("2026-07-12T15:00:00.000Z");
    expect(s).not.toContain("–");
  });
});

describe("label + color maps are complete", () => {
  it("every category has a label and color", () => {
    for (const key of Object.keys(CATEGORY_LABELS)) {
      expect(CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS]).toMatch(/^#/);
    }
  });
  it("age labels cover the standard bands", () => {
    expect(Object.keys(AGE_LABELS)).toEqual(
      expect.arrayContaining(["infant", "toddler", "preschool", "kid", "all-ages"])
    );
  });
});
