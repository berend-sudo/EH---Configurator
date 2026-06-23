"use client";

import { selectionLabel, type Selection } from "@/lib/typologies";
import {
  maxAffordableBedrooms,
  type Currency,
  type PriceIndex,
} from "@/lib/affordability";

type Props = {
  priceIndex: PriceIndex | null | undefined;
  currency: Currency;
  budget: number;
  selection: Selection;
};

// One readable affordability line under the budget slider — the full-sentence
// counterpart to BedroomsCounter's terse "max X for this budget" hint. It states
// bedrooms, not money, so it's currency-agnostic by design.
export default function BudgetReach({ priceIndex, currency, budget, selection }: Props) {
  if (!priceIndex) return null;
  const n = maxAffordableBedrooms(priceIndex, currency, budget, selection, 0);
  const label = selectionLabel(selection);
  const sentence =
    n === 0
      ? `This budget covers a ${label} as a studio.`
      : `This budget covers a ${label} with up to ${n} ${
          n === 1 ? "bedroom" : "bedrooms"
        }.`;
  return (
    <div
      style={{
        marginTop: 10,
        fontSize: 12,
        color: "var(--eh-text-soft)",
      }}
    >
      {sentence}
    </div>
  );
}
