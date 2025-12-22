import { createHmac, createVerify, timingSafeEqual } from "node:crypto";

/**
 * Options for verifying a webhook signature.
 */
export type VerifyWebhookOptions = {
  /** Raw request body as string or Buffer */
  payload: string | Buffer;
  /** Value of the X-Monime-Signature header */
  signatureHeader: string;
  /** Secret key for HS256 verification */
  secret?: string;
  /** Public key in PEM format for ES256 verification */
  publicKey?: string;
  /** Maximum age of the signature in seconds (default: 300 = 5 minutes) */
  tolerance?: number;
};

/**
 * Result of parsing a webhook signature header.
 * @internal
 */
type ParsedSignature = {
  timestamp: number;
  algorithm: "HS256" | "ES256";
  signature: string;
};

/**
 * Error thrown when webhook signature verification fails.
 *
 * This error is thrown when:
 * - The signature header format is invalid
 * - The timestamp is too old or in the future
 * - Required credentials (secret or publicKey) are missing
 *
 * @see {@link WebhookVerification.verify}
 */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Utility class for verifying Monime webhook signatures.
 *
 * Monime signs webhook payloads to ensure they originate from Monime and have
 * not been tampered with. This class provides methods to verify these signatures
 * using either HS256 (HMAC-SHA256) or ES256 (ECDSA P-256) algorithms.
 *
 * **Signature Header Format:**
 *
 * The `X-Monime-Signature` header contains:
 * - `t=<timestamp>` - Unix timestamp when the signature was created
 * - `<algorithm>=<signature>` - The algorithm and signature value
 *
 * Example: `t=1703289600,hs256=abc123def456...`
 *
 * **Replay Attack Prevention:**
 *
 * Signatures include a timestamp to prevent replay attacks. By default,
 * signatures older than 5 minutes are rejected. Configure this with the
 * `tolerance` option.
 *
 * **Security Best Practices:**
 *
 * - Always verify signatures before processing webhook data
 * - Store webhook secrets securely (environment variables)
 * - Use HTTPS endpoints for webhook receivers
 * - Respond quickly (within 5 seconds) to avoid timeouts
 *
 */
export class WebhookVerification {
  /**
   * Verifies a webhook signature using the appropriate algorithm.
   *
   * This method parses the signature header, validates the timestamp,
   * and verifies the signature using either HS256 or ES256 based on
   * the algorithm specified in the header.
   *
   * @param options - Verification options
   * @returns `true` if the signature is valid and timestamp is within tolerance
   * @throws {WebhookVerificationError} If verification fails or header is invalid
   */
  static verify(options: VerifyWebhookOptions): boolean {
    const {
      payload,
      signatureHeader,
      secret,
      publicKey,
      tolerance = 300,
    } = options;

    const { timestamp, algorithm, signature } =
      WebhookVerification.parseHeader(signatureHeader);

    // Validate timestamp to prevent replay attacks
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;

    if (age < 0) {
      throw new WebhookVerificationError(
        `Timestamp is in the future by ${Math.abs(age)} seconds`,
      );
    }

    if (age > tolerance) {
      throw new WebhookVerificationError(
        `Timestamp is too old: ${age} seconds (tolerance: ${tolerance}s)`,
      );
    }

    if (algorithm === "HS256") {
      if (!secret) {
        throw new WebhookVerificationError(
          "HS256 verification requires a secret",
        );
      }
      return WebhookVerification.verifyHS256(
        payload,
        signature,
        timestamp,
        secret,
      );
    }

    if (!publicKey) {
      throw new WebhookVerificationError(
        "ES256 verification requires a publicKey",
      );
    }
    return WebhookVerification.verifyES256(
      payload,
      signature,
      timestamp,
      publicKey,
    );
  }

  /**
   * Verifies an HS256 (HMAC-SHA256) webhook signature.
   *
   * Use this method when you know the signature algorithm is HS256 and
   * you want to skip header parsing. For most use cases, prefer the
   * {@link WebhookVerification.verify} method.
   *
   * @param payload - The raw request body as string or Buffer
   * @param signature - The signature from the header (hex-encoded)
   * @param timestamp - The timestamp from the header (Unix seconds)
   * @param secret - The webhook secret
   * @returns `true` if the signature is valid
   */
  static verifyHS256(
    payload: string | Buffer,
    signature: string,
    timestamp: number,
    secret: string,
  ): boolean {
    const signedPayload = WebhookVerification.createSignedPayload(
      timestamp,
      payload,
    );
    const expectedSignature = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  /**
   * Verifies an ES256 (ECDSA P-256) webhook signature.
   *
   * Use this method when you know the signature algorithm is ES256 and
   * you want to skip header parsing. For most use cases, prefer the
   * {@link WebhookVerification.verify} method.
   *
   * @param payload - The raw request body as string or Buffer
   * @param signature - The signature from the header (base64-encoded)
   * @param timestamp - The timestamp from the header (Unix seconds)
   * @param publicKey - The public key in PEM format
   * @returns `true` if the signature is valid
   */
  static verifyES256(
    payload: string | Buffer,
    signature: string,
    timestamp: number,
    publicKey: string,
  ): boolean {
    const signedPayload = WebhookVerification.createSignedPayload(
      timestamp,
      payload,
    );
    const verifier = createVerify("SHA256");
    verifier.update(signedPayload);

    try {
      return verifier.verify(publicKey, signature, "base64");
    } catch {
      return false;
    }
  }

  /**
   * Parses the X-Monime-Signature header.
   *
   * @param header - The signature header value
   * @returns Parsed timestamp, algorithm, and signature
   * @throws {WebhookVerificationError} If header format is invalid
   * @internal
   */
  private static parseHeader(header: string): ParsedSignature {
    const parts = header.split(",");

    if (parts.length < 2) {
      throw new WebhookVerificationError(
        "Invalid signature header format: expected 't=<timestamp>,<algorithm>=<signature>'",
      );
    }

    const timestampPart = parts[0];
    if (!timestampPart?.startsWith("t=")) {
      throw new WebhookVerificationError(
        "Invalid signature header: missing timestamp (t=...)",
      );
    }

    const timestamp = Number.parseInt(timestampPart.slice(2), 10);
    if (Number.isNaN(timestamp)) {
      throw new WebhookVerificationError(
        "Invalid signature header: timestamp is not a valid number",
      );
    }

    const signaturePart = parts[1];
    if (!signaturePart) {
      throw new WebhookVerificationError(
        "Invalid signature header: missing signature",
      );
    }

    const [algorithmRaw, signature] = signaturePart.split("=");
    if (!algorithmRaw || !signature) {
      throw new WebhookVerificationError(
        "Invalid signature header: expected '<algorithm>=<signature>'",
      );
    }

    const algorithmLower = algorithmRaw.toLowerCase();
    if (algorithmLower !== "hs256" && algorithmLower !== "es256") {
      throw new WebhookVerificationError(
        `Unsupported signature algorithm: ${algorithmRaw}. Expected 'hs256' or 'es256'`,
      );
    }

    return {
      timestamp,
      algorithm: algorithmLower === "hs256" ? "HS256" : "ES256",
      signature,
    };
  }

  /**
   * Creates the signed payload string.
   *
   * The signed payload format is: `<timestamp>.<payload>`
   *
   * @param timestamp - Unix timestamp
   * @param payload - Request body
   * @returns The signed payload string
   * @internal
   */
  private static createSignedPayload(
    timestamp: number,
    payload: string | Buffer,
  ): string {
    const payloadStr = Buffer.isBuffer(payload)
      ? payload.toString("utf-8")
      : payload;
    return `${timestamp}.${payloadStr}`;
  }
}
