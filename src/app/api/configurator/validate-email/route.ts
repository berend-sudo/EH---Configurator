import { NextRequest, NextResponse } from "next/server";
import { resolveMx, resolve4, resolve6 } from "dns/promises";
import { EMAIL_RE } from "@/lib/configurator-submit";
import { emailDomain, isDisposableDomain, isTypoDomain } from "@/lib/contact-checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Confirms an email DOMAIN can receive mail — it has MX records (or, per
// RFC 5321 §5, an A/AAAA fallback). This catches typos and fake domains
// ("gmial.com", "asdf.zzz") which are the common "email doesn't exist" cases.
// It does NOT prove the specific mailbox exists (that needs an SMTP probe or a
// paid verification API). Advisory only — the response is a warning the form
// surfaces, never a hard block.

export interface EmailCheckResult {
  /** false only when we're confident the domain can't receive mail. */
  deliverable: boolean;
  warning: string | null;
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const mx = await resolveMx(domain);
    if (mx.length > 0) return true;
  } catch {
    // fall through to A/AAAA fallback
  }
  // RFC 5321 §5: with no MX, the A/AAAA record is an implicit mail target.
  try {
    const a = await resolve4(domain);
    if (a.length > 0) return true;
  } catch {
    /* ignore */
  }
  try {
    const aaaa = await resolve6(domain);
    if (aaaa.length > 0) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export async function GET(req: NextRequest) {
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim();

  const result: EmailCheckResult = { deliverable: true, warning: null };

  if (!EMAIL_RE.test(email)) {
    // The form's own format check already covers this; nothing to add.
    return NextResponse.json(result);
  }

  const domain = emailDomain(email);
  if (!domain) return NextResponse.json(result);

  if (isTypoDomain(domain)) {
    return NextResponse.json({
      deliverable: false,
      warning: `Did you mean a different domain? "${domain}" looks like a typo.`,
    } satisfies EmailCheckResult);
  }

  if (isDisposableDomain(domain)) {
    return NextResponse.json({
      deliverable: true,
      warning: "That looks like a temporary email — use one you'll check for your PDF.",
    } satisfies EmailCheckResult);
  }

  let accepts: boolean;
  try {
    accepts = await domainAcceptsMail(domain);
  } catch {
    // DNS hiccup — don't cry wolf, treat as deliverable.
    return NextResponse.json(result);
  }

  if (!accepts) {
    return NextResponse.json({
      deliverable: false,
      warning: `We can't find a mail server for "${domain}" — please check the address.`,
    } satisfies EmailCheckResult);
  }

  return NextResponse.json(result);
}
