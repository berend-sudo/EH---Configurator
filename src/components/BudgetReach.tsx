"use client";

import { selectionLabel, type Selection } from "@/lib/typologies";
import {
  selectionReach,
  type Currency,
  type PriceIndex,
} from "@/lib/affordability";

type Props = {
  priceIndex: PriceIndex | null | undefined;
  currency: Currency;
  budget: number;
  selection: Selection;
};

// "a" / "an" by the leading sound of the label (A-frame → "an", Gable → "a").
const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

// One readable affordability line under the budget slider — the full-sentence
// counterpart to BedroomsCounter's terse "max X for this budget" hint. It states
// bedrooms, not money, so it's currency-agnostic by design.
export default function BudgetReach({ priceIndex, currency, budget, selection }: Props) {
  if (!priceIndex) return null;
  const { hasPlan, affordable, bedrooms } = selectionReach(priceIndex, currency, budget, selection);
  if (!hasPlan) return null;
  const label = selectionLabel(selection);
  const sentence = !affordable
    ? `This budget doesn't quite reach ${article(label)} ${label} yet.`
    : bedrooms === 0
      ? `This budget covers ${article(label)} ${label} studio.`
      : `This budget covers ${article(label)} ${label} with up to ${bedrooms} ${
          bedrooms === 1 ? "bedroom" : "bedrooms"
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
