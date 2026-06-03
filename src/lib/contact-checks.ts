// Best-effort "does this contact actually exist" signals, shared by the client
// form and the server. These are advisory (warnings), not hard guarantees:
//
//   • Email — we can confirm the domain can RECEIVE mail (it has MX / A
//     records) and isn't a known disposable provider. Confirming the exact
//     mailbox exists needs an SMTP probe or a paid verification API; see
//     `validateEmailDeliverability` in src/app/api/configurator/validate-email.
//   • Phone — without a reliable country we can only check the digit count is
//     in the E.164 range and nudge the user to include a country code. True
//     line-exists / active checks need a paid lookup (e.g. Twilio Lookup).
//
// The goal is to catch typos and obviously-fake input ("gmial.com",
// "1234", a number with no country code) and warn, not to block submission.

export interface ContactWarning {
  field: "email" | "phone";
  message: string;
}

// ── Phone ──────────────────────────────────────────────────────────────────
export interface PhoneCheck {
  ok: boolean;
  e164ish: string; // normalized: leading + (if given) followed by digits
  digits: number;
  warning: string | null;
}

export function checkPhone(raw: string): PhoneCheck {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  const e164ish = (hasPlus ? "+" : "") + digits;

  let warning: string | null = null;
  if (digits.length < 7) {
    warning = "That phone number looks too short — please double-check it.";
  } else if (digits.length > 15) {
    warning = "That phone number looks too long — please double-check it.";
  } else if (!hasPlus) {
    // 10-ish local numbers without a country code are the most common
    // "looks fine but unreachable from here" case (e.g. the EU number
    // 4838484848). Nudge, don't block.
    warning = "Add your country code so we can reach you (e.g. +256 …).";
  }

  return { ok: warning === null, e164ish, digits: digits.length, warning };
}

// ── Email ──────────────────────────────────────────────────────────────────
// A small list of common throwaway domains. Not exhaustive — just the ones we
// see most. The MX check (server-side) does the heavy lifting.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
]);

// Common typo domains → the address almost certainly won't receive mail.
const TYPO_DOMAINS = new Set([
  "gmial.com",
  "gmai.com",
  "gmail.con",
  "gmail.co",
  "hotmial.com",
  "hotmai.com",
  "yahooo.com",
  "yaho.com",
  "outlok.com",
  "iclould.com",
]);

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.length > 0 ? domain : null;
}

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain);
}

export function isTypoDomain(domain: string): boolean {
  return TYPO_DOMAINS.has(domain);
}
