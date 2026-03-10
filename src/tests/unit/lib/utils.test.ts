import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "nope", "yes")).toBe("base yes");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(5000)).toBe("$50.00");
  });

  it("formats cents", () => {
    expect(formatCurrency(99)).toBe("$0.99");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amounts", () => {
    expect(formatCurrency(1000000)).toBe("$10,000.00");
  });

  it("formats 3500 cents as $35.00", () => {
    expect(formatCurrency(3500)).toBe("$35.00");
  });

  it("formats 12000 cents as $120.00", () => {
    expect(formatCurrency(12000)).toBe("$120.00");
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-03-15");
    expect(result).toBe("Mar 15, 2026");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date("2026-01-01T12:00:00Z"));
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2026/);
  });
});

describe("formatTime", () => {
  it("formats 09:00 as 9:00 AM", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
  });

  it("formats 13:30 as 1:30 PM", () => {
    expect(formatTime("13:30")).toBe("1:30 PM");
  });

  it("formats 12:00 as 12:00 PM", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("formats 00:00 as 12:00 AM", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
  });

  it("formats 23:59 as 11:59 PM", () => {
    expect(formatTime("23:59")).toBe("11:59 PM");
  });
});
