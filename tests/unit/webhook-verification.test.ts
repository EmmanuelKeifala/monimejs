import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  WebhookVerification,
  WebhookVerificationError,
} from "../../src/webhook-verification";

describe("WebhookVerificationError", () => {
  test("should create error with message", () => {
    const error = new WebhookVerificationError("Test error");
    expect(error.message).toBe("Test error");
    expect(error.name).toBe("WebhookVerificationError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("WebhookVerification.verifyHS256", () => {
  const secret = "whsec_testsecret123456789";
  const timestamp = 1703289600;
  const payload = '{"event":"payment.completed","data":{}}';

  function createValidSignature(ts: number, body: string): string {
    const signedPayload = `${ts}.${body}`;
    return createHmac("sha256", secret).update(signedPayload).digest("hex");
  }

  test("should return true for valid signature", () => {
    const signature = createValidSignature(timestamp, payload);
    const result = WebhookVerification.verifyHS256(
      payload,
      signature,
      timestamp,
      secret,
    );
    expect(result).toBe(true);
  });

  test("should return false for invalid signature", () => {
    const result = WebhookVerification.verifyHS256(
      payload,
      "invalid",
      timestamp,
      secret,
    );
    expect(result).toBe(false);
  });

  test("should return false for wrong secret", () => {
    const signature = createValidSignature(timestamp, payload);
    const result = WebhookVerification.verifyHS256(
      payload,
      signature,
      timestamp,
      "wrong_secret",
    );
    expect(result).toBe(false);
  });

  test("should return false for tampered payload", () => {
    const signature = createValidSignature(timestamp, payload);
    const tamperedPayload =
      '{"event":"payment.completed","data":{"tampered":true}}';
    const result = WebhookVerification.verifyHS256(
      tamperedPayload,
      signature,
      timestamp,
      secret,
    );
    expect(result).toBe(false);
  });

  test("should return false for wrong timestamp", () => {
    const signature = createValidSignature(timestamp, payload);
    const result = WebhookVerification.verifyHS256(
      payload,
      signature,
      timestamp + 1,
      secret,
    );
    expect(result).toBe(false);
  });

  test("should work with Buffer payload", () => {
    const bufferPayload = Buffer.from(payload, "utf-8");
    const signature = createValidSignature(timestamp, payload);
    const result = WebhookVerification.verifyHS256(
      bufferPayload,
      signature,
      timestamp,
      secret,
    );
    expect(result).toBe(true);
  });
});

describe("WebhookVerification.verifyES256", () => {
  test("should return false for invalid signature", () => {
    const payload = '{"event":"test"}';
    const invalidSignature = "invalid_base64";
    const invalidKey = "not a real key";

    const result = WebhookVerification.verifyES256(
      payload,
      invalidSignature,
      1703289600,
      invalidKey,
    );
    expect(result).toBe(false);
  });
});

describe("WebhookVerification.verify", () => {
  const secret = "whsec_testsecret123456789";
  const payload = '{"event":"payment.completed"}';

  function createHS256Header(ts: number, body: string): string {
    const signedPayload = `${ts}.${body}`;
    const signature = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");
    return `t=${ts},hs256=${signature}`;
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should verify valid HS256 signature", () => {
    const now = 1703289600;
    vi.setSystemTime(now * 1000);

    const signatureHeader = createHS256Header(now, payload);

    const result = WebhookVerification.verify({
      payload,
      signatureHeader,
      secret,
    });

    expect(result).toBe(true);
  });

  test("should reject timestamp that is too old", () => {
    const now = 1703289600;
    vi.setSystemTime(now * 1000);

    const oldTimestamp = now - 400;
    const signatureHeader = createHS256Header(oldTimestamp, payload);

    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader,
        secret,
      }),
    ).toThrow(WebhookVerificationError);
  });

  test("should reject timestamp in the future", () => {
    const now = 1703289600;
    vi.setSystemTime(now * 1000);

    const futureTimestamp = now + 60;
    const signatureHeader = createHS256Header(futureTimestamp, payload);

    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader,
        secret,
      }),
    ).toThrow(WebhookVerificationError);
  });

  test("should respect custom tolerance", () => {
    const now = 1703289600;
    vi.setSystemTime(now * 1000);

    const oldTimestamp = now - 100;
    const signatureHeader = createHS256Header(oldTimestamp, payload);

    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader,
        secret,
        tolerance: 60,
      }),
    ).toThrow(WebhookVerificationError);

    const result = WebhookVerification.verify({
      payload,
      signatureHeader,
      secret,
      tolerance: 200,
    });
    expect(result).toBe(true);
  });

  test("should throw for missing secret with HS256", () => {
    const now = 1703289600;
    vi.setSystemTime(now * 1000);

    const signatureHeader = createHS256Header(now, payload);

    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader,
      }),
    ).toThrow("HS256 verification requires a secret");
  });

  test("should throw for missing publicKey with ES256", () => {
    const now = 1703289600;
    vi.setSystemTime(now * 1000);

    const signatureHeader = `t=${now},es256=MEUCIQDsomesignature`;

    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader,
      }),
    ).toThrow("ES256 verification requires a publicKey");
  });

  test("should throw for invalid header format", () => {
    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader: "invalid",
        secret,
      }),
    ).toThrow(WebhookVerificationError);
  });

  test("should throw for missing timestamp", () => {
    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader: "hs256=somesignature",
        secret,
      }),
    ).toThrow("Invalid signature header");
  });

  test("should throw for unsupported algorithm", () => {
    expect(() =>
      WebhookVerification.verify({
        payload,
        signatureHeader: "t=1703289600,rs256=somesignature",
        secret,
      }),
    ).toThrow("Unsupported signature algorithm");
  });
});
