import { describe, it, expect } from "vitest";
import {
  classifyCategory,
  classifyAgeBands,
  detectFree,
  eventId,
} from "@/lib/scraper/classify";

describe("classifyCategory", () => {
  it("detects storytime", () => {
    expect(classifyCategory("Toddler Storytime: Songs")).toBe("storytime");
  });
  it("detects arts-crafts", () => {
    expect(classifyCategory("Preschool Craft Morning")).toBe("arts-crafts");
  });
  it("detects music", () => {
    expect(classifyCategory("Family Music Jam", "dance along")).toBe("music");
  });
  it("detects outdoor/nature", () => {
    expect(classifyCategory("Nature Walk at the Preserve")).toBe("outdoor");
  });
  it("detects museum/science", () => {
    expect(classifyCategory("Little Scientists: Sensory Lab", "science center")).toBe(
      "museum"
    );
  });
  it("falls back to other", () => {
    expect(classifyCategory("Community Meeting")).toBe("other");
  });
});

describe("classifyAgeBands", () => {
  it("detects toddler", () => {
    expect(classifyAgeBands("Toddler time ages 1-3")).toContain("toddler");
  });
  it("detects infant", () => {
    expect(classifyAgeBands("Baby Lapsit")).toContain("infant");
  });
  it("detects preschool", () => {
    expect(classifyAgeBands("Pre-K program ages 3-5")).toContain("preschool");
  });
  it("defaults to all-ages with no signal", () => {
    expect(classifyAgeBands("Downtown Market")).toEqual(["all-ages"]);
  });
});

describe("detectFree", () => {
  it("true when 'free' present", () => {
    expect(detectFree("Free storytime")).toBe(true);
  });
  it("false when a price is present", () => {
    expect(detectFree("Admission $12")).toBe(false);
  });
  it("false when ticket/fee wording present", () => {
    expect(detectFree("Buy your ticket now")).toBe(false);
  });
  it("defaults to free for plain municipal text", () => {
    expect(detectFree("Library program")).toBe(true);
  });
});

describe("eventId", () => {
  it("is deterministic for identical inputs", () => {
    const a = eventId("src", "Title", "2026-07-12T15:00:00.000Z");
    const b = eventId("src", "  title ", "2026-07-12T15:00:00.000Z");
    expect(a).toBe(b);
  });
  it("differs when start time differs", () => {
    const a = eventId("src", "Title", "2026-07-12T15:00:00.000Z");
    const b = eventId("src", "Title", "2026-07-13T15:00:00.000Z");
    expect(a).not.toBe(b);
  });
  it("has the evt_ prefix and hex body", () => {
    expect(eventId("s", "t", "d")).toMatch(/^evt_[0-9a-f]{8}$/);
  });
});
