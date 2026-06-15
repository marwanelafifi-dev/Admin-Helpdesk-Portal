import crypto from "crypto"

/**
 * HMAC-signed tokens for one-shot approve/reject links sent by email.
 *
 * Token shape: `<base64url(payload)>.<base64url(hmac)>`
 *   payload = JSON({ rid, act, exp })
 *     rid  request id
 *     act  "approve" | "reject"
 *     exp  unix epoch seconds (expiry, default 14 days from issue)
 *
 * Signed with AUTH_SECRET — the same secret used by NextAuth — so anyone
 * with read access to the env can verify but not anyone outside the app
 * can forge. A token can only do ONE thing (approve OR reject for a
 * specific request id), and the route enforces single-use by checking
 * the current status before applying the action.
 */

interface TokenPayload {
  rid: string
  act: "approve" | "reject"
  /** Manager email the token was issued to — server verifies the request's
   *  current Direct Manager still matches before applying the action. */
  mgr?: string
  exp: number
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""
  if (!secret) {
    throw new Error("AUTH_SECRET is required to sign approval tokens")
  }
  return secret
}

function base64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64url(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4))
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64")
}

export function signApprovalToken(
  rid: string,
  act: "approve" | "reject",
  managerEmail?: string,
  expSecondsFromNow = 14 * 24 * 60 * 60,
): string {
  const payload: TokenPayload = {
    rid,
    act,
    mgr: managerEmail?.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
  }
  const payloadEncoded = base64url(JSON.stringify(payload))
  const hmac = crypto.createHmac("sha256", getSecret()).update(payloadEncoded).digest()
  const sig = base64url(hmac)
  return `${payloadEncoded}.${sig}`
}

export function verifyApprovalToken(token: string, expectedAction: "approve" | "reject"):
  | { ok: true; rid: string; managerEmail?: string }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "wrong_action" }
{
  const parts = token.split(".")
  if (parts.length !== 2) return { ok: false, reason: "malformed" }
  const [payloadEncoded, sig] = parts
  let expectedSig: string
  try {
    const hmac = crypto.createHmac("sha256", getSecret()).update(payloadEncoded).digest()
    expectedSig = base64url(hmac)
  } catch {
    return { ok: false, reason: "bad_signature" }
  }
  // constant-time compare
  if (sig.length !== expectedSig.length) return { ok: false, reason: "bad_signature" }
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { ok: false, reason: "bad_signature" }
  }
  let parsed: TokenPayload
  try {
    parsed = JSON.parse(fromBase64url(payloadEncoded).toString("utf-8"))
  } catch {
    return { ok: false, reason: "malformed" }
  }
  if (parsed.act !== expectedAction) return { ok: false, reason: "wrong_action" }
  if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" }
  }
  return { ok: true, rid: parsed.rid, managerEmail: parsed.mgr }
}
