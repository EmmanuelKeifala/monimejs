import { describe, expect, test } from "vitest";
import { MonimeValidationError } from "../../src/errors";
import {
  AmountSchema,
  CreateCheckoutSessionInputSchema,
  CreatePaymentCodeInputSchema,
  CreatePayoutInputSchema,
  CreateWebhookInputSchema,
  MetadataSchema,
} from "../../src/schemas";
import { validate } from "../../src/validation";

describe("AmountSchema", () => {
  test("should accept valid SLE amount", () => {
    expect(() =>
      validate(AmountSchema, { currency: "SLE", value: 1000 }),
    ).not.toThrow();
  });

  test("should accept valid USD amount", () => {
    expect(() =>
      validate(AmountSchema, { currency: "USD", value: 500 }),
    ).not.toThrow();
  });

  test("should accept zero value", () => {
    expect(() =>
      validate(AmountSchema, { currency: "SLE", value: 0 }),
    ).not.toThrow();
  });

  test("should reject negative value", () => {
    expect(() =>
      validate(AmountSchema, { currency: "SLE", value: -100 }),
    ).toThrow(MonimeValidationError);
  });

  test("should reject invalid currency", () => {
    expect(() =>
      validate(AmountSchema, { currency: "EUR", value: 100 }),
    ).toThrow(MonimeValidationError);
  });

  test("should reject missing currency", () => {
    expect(() => validate(AmountSchema, { value: 100 })).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject missing value", () => {
    expect(() => validate(AmountSchema, { currency: "SLE" })).toThrow(
      MonimeValidationError,
    );
  });
});

describe("MetadataSchema", () => {
  test("should accept valid metadata", () => {
    expect(() =>
      validate(MetadataSchema, { key1: "value1", key2: "value2" }),
    ).not.toThrow();
  });

  test("should accept empty object", () => {
    expect(() => validate(MetadataSchema, {})).not.toThrow();
  });

  test("should reject more than 64 keys", () => {
    const metadata: Record<string, string> = {};
    for (let i = 0; i < 65; i++) {
      metadata[`key${i}`] = `value${i}`;
    }
    expect(() => validate(MetadataSchema, metadata)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject value longer than 100 characters", () => {
    const longValue = "a".repeat(101);
    expect(() => validate(MetadataSchema, { key: longValue })).toThrow(
      MonimeValidationError,
    );
  });
});

describe("CreatePaymentCodeInputSchema", () => {
  test("should accept one-time payment code", () => {
    const input = {
      name: "Test Payment",
      mode: "one_time",
    };
    expect(() => validate(CreatePaymentCodeInputSchema, input)).not.toThrow();
  });

  test("should accept one-time mode by default (mode undefined)", () => {
    const input = {
      name: "Test Payment",
    };
    expect(() => validate(CreatePaymentCodeInputSchema, input)).not.toThrow();
  });

  test("should accept recurrent payment code with target", () => {
    const input = {
      name: "Monthly Subscription",
      mode: "recurrent",
      recurrentPaymentTarget: {
        expectedPaymentCount: 12,
      },
    };
    expect(() => validate(CreatePaymentCodeInputSchema, input)).not.toThrow();
  });

  test("should reject name shorter than 3 characters", () => {
    const input = { name: "AB" };
    expect(() => validate(CreatePaymentCodeInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject name longer than 64 characters", () => {
    const input = { name: "A".repeat(65) };
    expect(() => validate(CreatePaymentCodeInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });

  test("should accept valid authorized providers", () => {
    const input = {
      name: "Test Payment",
      authorizedProviders: ["m17", "m18", "m13"],
    };
    expect(() => validate(CreatePaymentCodeInputSchema, input)).not.toThrow();
  });
});

describe("CreatePayoutInputSchema", () => {
  test("should accept momo payout", () => {
    const input = {
      amount: { currency: "SLE", value: 5000 },
      destination: {
        type: "momo",
        providerId: "m17",
        phoneNumber: "23276123456",
      },
    };
    expect(() => validate(CreatePayoutInputSchema, input)).not.toThrow();
  });

  test("should accept bank payout", () => {
    const input = {
      amount: { currency: "SLE", value: 10000 },
      destination: {
        type: "bank",
        providerId: "slcb",
        accountNumber: "1234567890",
      },
    };
    expect(() => validate(CreatePayoutInputSchema, input)).not.toThrow();
  });

  test("should accept wallet payout", () => {
    const input = {
      amount: { currency: "USD", value: 100 },
      destination: {
        type: "wallet",
        providerId: "monime",
      },
    };
    expect(() => validate(CreatePayoutInputSchema, input)).not.toThrow();
  });

  test("should accept payout with source", () => {
    const input = {
      amount: { currency: "SLE", value: 5000 },
      destination: {
        type: "momo",
        providerId: "m17",
        phoneNumber: "23276123456",
      },
      source: {
        financialAccountId: "fa-123",
      },
    };
    expect(() => validate(CreatePayoutInputSchema, input)).not.toThrow();
  });

  test("should reject missing destination", () => {
    const input = {
      amount: { currency: "SLE", value: 5000 },
    };
    expect(() => validate(CreatePayoutInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });
});

describe("CreateCheckoutSessionInputSchema", () => {
  test("should accept valid checkout session", () => {
    const input = {
      name: "Order #1234",
      lineItems: [
        {
          type: "custom",
          name: "Product A",
          price: { currency: "SLE", value: 1000 },
          quantity: 2,
        },
      ],
    };
    expect(() =>
      validate(CreateCheckoutSessionInputSchema, input),
    ).not.toThrow();
  });

  test("should accept multiple line items", () => {
    const input = {
      name: "Shopping Cart",
      lineItems: [
        {
          type: "custom",
          name: "Product A",
          price: { currency: "SLE", value: 1000 },
          quantity: 1,
        },
        {
          type: "custom",
          name: "Product B",
          price: { currency: "SLE", value: 500 },
          quantity: 3,
        },
      ],
    };
    expect(() =>
      validate(CreateCheckoutSessionInputSchema, input),
    ).not.toThrow();
  });

  test("should reject empty line items", () => {
    const input = {
      name: "Order",
      lineItems: [],
    };
    expect(() => validate(CreateCheckoutSessionInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject quantity less than 1", () => {
    const input = {
      name: "Order",
      lineItems: [
        {
          type: "custom",
          name: "Product",
          price: { currency: "SLE", value: 100 },
          quantity: 0,
        },
      ],
    };
    expect(() => validate(CreateCheckoutSessionInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject more than 16 line items", () => {
    const lineItems = Array.from({ length: 17 }, (_, i) => ({
      type: "custom" as const,
      name: `Product ${i}`,
      price: { currency: "SLE" as const, value: 100 },
      quantity: 1,
    }));
    const input = { name: "Order", lineItems };
    expect(() => validate(CreateCheckoutSessionInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });
});

describe("CreateWebhookInputSchema", () => {
  test("should accept valid webhook", () => {
    const input = {
      name: "Payment Events",
      url: "https://example.com/webhook",
      apiRelease: "caph",
      events: ["payment.completed"],
    };
    expect(() => validate(CreateWebhookInputSchema, input)).not.toThrow();
  });

  test("should accept webhook with HS256 verification", () => {
    const input = {
      name: "Secure Webhook",
      url: "https://example.com/webhook",
      apiRelease: "siriusb",
      events: ["payout.completed", "payout.failed"],
      verificationMethod: {
        type: "HS256",
        secret: "a".repeat(32), // minimum 32 chars
      },
    };
    expect(() => validate(CreateWebhookInputSchema, input)).not.toThrow();
  });

  test("should reject empty events array", () => {
    const input = {
      name: "Webhook",
      url: "https://example.com/webhook",
      apiRelease: "caph",
      events: [],
    };
    expect(() => validate(CreateWebhookInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject HS256 secret shorter than 32 characters", () => {
    const input = {
      name: "Webhook",
      url: "https://example.com/webhook",
      apiRelease: "caph",
      events: ["payment.completed"],
      verificationMethod: {
        type: "HS256",
        secret: "tooshort",
      },
    };
    expect(() => validate(CreateWebhookInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject invalid apiRelease", () => {
    const input = {
      name: "Webhook",
      url: "https://example.com/webhook",
      apiRelease: "invalid",
      events: ["payment.completed"],
    };
    expect(() => validate(CreateWebhookInputSchema, input)).toThrow(
      MonimeValidationError,
    );
  });
});
