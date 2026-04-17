import { describe, expect, it } from "vitest";
import {
  marginUsd,
  vatUsd,
  usdToUgx,
  roundUpUgx,
  MARGIN,
  VAT,
  USD_TO_UGX,
} from "@/lib/costEngine";

describe("pricing primitives", () => {
  it("MARGIN = 10%", () => {
    expect(MARGIN).toBe(0.1);
  });

  it("VAT = 18%", () => {
    expect(VAT).toBe(0.18);
  });

  it("USD_TO_UGX = 3700", () => {
    expect(USD_TO_UGX).toBe(3700);
  });

  describe("marginUsd", () => {
    it("applies 10% margin", () => {
      expect(marginUsd(20000)).toBe(2000);
      expect(marginUsd(20866.88)).toBeCloseTo(2086.688, 4);
    });

    it("returns 0 for zero cost", () => {
      expect(marginUsd(0)).toBe(0);
    });
  });

  describe("vatUsd", () => {
    it("applies 18% VAT", () => {
      expect(vatUsd(22953.57)).toBeCloseTo(4131.6426, 4);
      expect(vatUsd(100)).toBe(18);
    });
  });

  describe("usdToUgx", () => {
    it("converts at 3700 UGX/USD", () => {
      expect(usdToUgx(1)).toBe(3700);
      expect(usdToUgx(20866.88328)).toBeCloseTo(77207468.14, 0);
    });
  });

  describe("roundUpUgx", () => {
    it("rounds 99,999,999 UP to 100,000,000", () => {
      expect(roundUpUgx(99_999_999)).toBe(100_000_000);
    });

    it("leaves an exact multiple of 100,000 unchanged", () => {
      expect(roundUpUgx(100_000_000)).toBe(100_000_000);
      expect(roundUpUgx(100_200_000)).toBe(100_200_000);
    });

    it("rounds 100,000,001 UP to 100,100,000", () => {
      expect(roundUpUgx(100_000_001)).toBe(100_100_000);
    });

    it("rounds the headline 100,215,294 UP to 100,300,000", () => {
      expect(roundUpUgx(100_215_294)).toBe(100_300_000);
    });

    it("treats 0 as 0", () => {
      expect(roundUpUgx(0)).toBe(0);
    });
  });
});
