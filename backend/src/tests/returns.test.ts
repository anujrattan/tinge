import { describe, it, expect } from "vitest";
import {
  generateReturnNumber,
  isWithinReturnWindow,
  RETURN_WINDOW_DAYS,
} from "../services/returns.js";

describe("returns service", () => {
  it("generates RAN with order number prefix", () => {
    const ran = generateReturnNumber("ORD-12345");
    expect(ran).toMatch(/^RET-ORD-12345-[A-F0-9]{8}$/);
  });

  it("validates return window", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);
    expect(isWithinReturnWindow(recent.toISOString())).toBe(true);

    const old = new Date();
    old.setDate(old.getDate() - (RETURN_WINDOW_DAYS + 1));
    expect(isWithinReturnWindow(old.toISOString())).toBe(false);
  });

  it("rejects missing delivered_at", () => {
    expect(isWithinReturnWindow(null)).toBe(false);
    expect(isWithinReturnWindow(undefined)).toBe(false);
  });
});
