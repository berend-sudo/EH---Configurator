import { PRICE_BOOK } from "@/lib/pricing/price-book.generated";
import {
  BUDGET_BLURB_SHORT,
  BUDGET_TERMS,
  excludedBullets,
} from "@/lib/pricing/budget-copy";

interface Props {
  /** Render the "what's included" framing paragraph. */
  blurb?: boolean;
  /** Render the VAT / "no rights derived" terms paragraph. */
  terms?: boolean;
}

/**
 * Compact "what's included / priced separately" note shown under the indicative
 * budget on the configurator card and the /summary screen. The included framing
 * is brand copy; the priced-separately bullets are generated from the workbook's
 * quotation items, so they track each pricing upload (and stay in step with the
 * fuller "About this budget" block on the PDF). The terrace is deliberately not
 * listed here — it is measured from the plan and priced into the figure.
 */
export default function BudgetDisclosure({ blurb = true, terms = false }: Props) {
  const muted = "var(--eh-text-soft)";
  return (
    <div style={{ marginTop: 10 }}>
      {blurb && (
        <p style={{ fontSize: 11, lineHeight: 1.5, color: muted, margin: 0 }}>
          {BUDGET_BLURB_SHORT}
        </p>
      )}
      <p style={{ fontSize: 11, lineHeight: 1.5, color: muted, margin: "8px 0 4px", fontWeight: 500 }}>
        Priced separately:
      </p>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {excludedBullets(PRICE_BOOK.quotationItems).map((b, i) => (
          <li key={i} style={{ fontSize: 11, lineHeight: 1.45, color: muted }}>
            {b}
          </li>
        ))}
      </ul>
      {terms && (
        <p style={{ fontSize: 11, lineHeight: 1.5, color: muted, margin: "8px 0 0" }}>
          {BUDGET_TERMS}
        </p>
      )}
    </div>
  );
}
