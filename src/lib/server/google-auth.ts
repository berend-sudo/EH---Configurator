import crypto from "crypto";

// Shared Google service-account auth — RS256 JWT + token exchange, no
// `googleapis` package. Used by sheets.ts and drive.ts. The same env var
// (GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON) covers both surfaces; the service
// account just needs the relevant scopes granted at the resource level
// (sheet shared with the SA email, Shared Drive lists the SA as a member).

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON missing.");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service account JSON is missing client_email / private_key.");
  }
  // Env vars often carry the key with escaped newlines.
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

export async function getAccessToken(scopes: string[]): Promise<string> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: scopes.join(" "),
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = b64url(signer.sign(sa.private_key));
  const assertion = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token in token response.");
  return json.access_token;
}
