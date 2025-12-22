import { describe, expect, test } from "vitest";
import { MonimeClient } from "../../src/client";
import { MonimeValidationError } from "../../src/errors";

function createClient() {
  return new MonimeClient({
    spaceId: "spc-test123",
    accessToken: "test-token",
  });
}

describe("PaymentCodeModule", () => {
  describe("create", () => {
    test("should create one-time payment code", async () => {
      const client = createClient();
      const result = await client.paymentCode.create({
        name: "Test Payment",
        amount: { currency: "SLE", value: 1000 },
      });

      expect(result.success).toBe(true);
      expect(result.result.id).toBeDefined();
    });

    test("should validate name length", async () => {
      const client = createClient();

      await expect(
        client.paymentCode.create({ name: "AB" }), // Too short
      ).rejects.toThrow(MonimeValidationError);
    });
  });

  describe("get", () => {
    test("should get payment code by ID", async () => {
      const client = createClient();
      const result = await client.paymentCode.get("pmc-123");

      expect(result.success).toBe(true);
      expect(result.result.id).toBe("pmc-123");
    });

    test("should validate ID is not empty", async () => {
      const client = createClient();

      await expect(client.paymentCode.get("")).rejects.toThrow(
        MonimeValidationError,
      );
    });
  });

  describe("list", () => {
    test("should list payment codes", async () => {
      const client = createClient();
      const result = await client.paymentCode.list();

      expect(result.success).toBe(true);
      expect(result.result).toBeInstanceOf(Array);
    });

    test("should validate limit range", async () => {
      const client = createClient();

      await expect(client.paymentCode.list({ limit: 100 })).rejects.toThrow(
        MonimeValidationError,
      );
    });
  });

  describe("update", () => {
    test("should update payment code", async () => {
      const client = createClient();
      const result = await client.paymentCode.update("pmc-123", {
        name: "Updated Name",
      });

      expect(result.success).toBe(true);
      expect(result.result.name).toBe("Updated Name");
    });
  });

  describe("delete", () => {
    test("should delete payment code", async () => {
      const client = createClient();
      const result = await client.paymentCode.delete("pmc-123");

      expect(result.success).toBe(true);
    });
  });
});

describe("PayoutModule", () => {
  describe("create", () => {
    test("should create momo payout", async () => {
      const client = createClient();
      const result = await client.payout.create({
        amount: { currency: "SLE", value: 5000 },
        destination: {
          type: "momo",
          providerId: "m17",
          phoneNumber: "23276123456",
        },
      });

      expect(result.success).toBe(true);
      expect(result.result.id).toBeDefined();
    });

    test("should validate amount is positive", async () => {
      const client = createClient();

      await expect(
        client.payout.create({
          amount: { currency: "SLE", value: -100 },
          destination: {
            type: "momo",
            providerId: "m17",
            phoneNumber: "23276123456",
          },
        }),
      ).rejects.toThrow(MonimeValidationError);
    });
  });

  describe("get", () => {
    test("should get payout by ID", async () => {
      const client = createClient();
      const result = await client.payout.get("pyt-123");

      expect(result.success).toBe(true);
      expect(result.result.id).toBe("pyt-123");
    });
  });

  describe("list", () => {
    test("should list payouts", async () => {
      const client = createClient();
      const result = await client.payout.list();

      expect(result.success).toBe(true);
      expect(result.result).toBeInstanceOf(Array);
    });
  });
});

describe("WebhookModule", () => {
  describe("create", () => {
    test("should create webhook", async () => {
      const client = createClient();
      const result = await client.webhook.create({
        name: "Payment Events",
        url: "https://example.com/webhook",
        apiRelease: "caph",
        events: ["payment.completed"],
      });

      expect(result.success).toBe(true);
      expect(result.result.id).toBeDefined();
    });

    test("should validate events is not empty", async () => {
      const client = createClient();

      await expect(
        client.webhook.create({
          name: "Webhook",
          url: "https://example.com/webhook",
          apiRelease: "caph",
          events: [],
        }),
      ).rejects.toThrow(MonimeValidationError);
    });
  });

  describe("get", () => {
    test("should get webhook by ID", async () => {
      const client = createClient();
      const result = await client.webhook.get("whk-123");

      expect(result.success).toBe(true);
      expect(result.result.id).toBe("whk-123");
    });
  });

  describe("list", () => {
    test("should list webhooks", async () => {
      const client = createClient();
      const result = await client.webhook.list();

      expect(result.success).toBe(true);
      expect(result.result).toBeInstanceOf(Array);
    });
  });

  describe("delete", () => {
    test("should delete webhook", async () => {
      const client = createClient();
      const result = await client.webhook.delete("whk-123");

      expect(result.success).toBe(true);
    });
  });
});

describe("MonimeClient", () => {
  test("should expose all modules", () => {
    const client = createClient();

    expect(client.bank).toBeDefined();
    expect(client.financialAccount).toBeDefined();
    expect(client.financialTransaction).toBeDefined();
    expect(client.paymentCode).toBeDefined();
    expect(client.payment).toBeDefined();
    expect(client.checkoutSession).toBeDefined();
    expect(client.payout).toBeDefined();
    expect(client.webhook).toBeDefined();
    expect(client.internalTransfer).toBeDefined();
    expect(client.momo).toBeDefined();
    expect(client.receipt).toBeDefined();
    expect(client.ussdOtp).toBeDefined();
  });

  test("should validate client options", () => {
    expect(
      () =>
        new MonimeClient({
          spaceId: "",
          accessToken: "token",
        }),
    ).toThrow(MonimeValidationError);
  });
});

describe("CheckoutSessionModule", () => {
  test("should create checkout session", async () => {
    const client = createClient();
    const result = await client.checkoutSession.create({
      name: "Order #123",
      lineItems: [
        {
          type: "custom",
          name: "Product",
          price: { currency: "SLE", value: 1000 },
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.result.id).toBeDefined();
  });

  test("should get checkout session", async () => {
    const client = createClient();
    const result = await client.checkoutSession.get("cs-123");

    expect(result.success).toBe(true);
    expect(result.result.id).toBe("cs-123");
  });

  test("should list checkout sessions", async () => {
    const client = createClient();
    const result = await client.checkoutSession.list();

    expect(result.success).toBe(true);
    expect(result.result).toBeInstanceOf(Array);
  });
});

describe("FinancialAccountModule", () => {
  test("should create financial account", async () => {
    const client = createClient();
    const result = await client.financialAccount.create({
      name: "Main Account",
      currency: "SLE",
    });

    expect(result.success).toBe(true);
    expect(result.result.id).toBeDefined();
  });

  test("should get financial account", async () => {
    const client = createClient();
    const result = await client.financialAccount.get("fa-123");

    expect(result.success).toBe(true);
    expect(result.result.id).toBe("fa-123");
  });

  test("should list financial accounts", async () => {
    const client = createClient();
    const result = await client.financialAccount.list();

    expect(result.success).toBe(true);
    expect(result.result).toBeInstanceOf(Array);
  });
});

describe("FinancialTransactionModule", () => {
  test("should get financial transaction", async () => {
    const client = createClient();
    const result = await client.financialTransaction.get("ft-123");

    expect(result.success).toBe(true);
    expect(result.result.id).toBe("ft-123");
  });

  test("should list financial transactions", async () => {
    const client = createClient();
    const result = await client.financialTransaction.list();

    expect(result.success).toBe(true);
    expect(result.result).toBeInstanceOf(Array);
  });
});

describe("InternalTransferModule", () => {
  test("should create internal transfer", async () => {
    const client = createClient();
    const result = await client.internalTransfer.create({
      amount: { currency: "SLE", value: 1000 },
      sourceFinancialAccount: { id: "fa-source" },
      destinationFinancialAccount: { id: "fa-dest" },
    });

    expect(result.success).toBe(true);
    expect(result.result.id).toBeDefined();
  });

  test("should get internal transfer", async () => {
    const client = createClient();
    const result = await client.internalTransfer.get("it-123");

    expect(result.success).toBe(true);
    expect(result.result.id).toBe("it-123");
  });
});

describe("MomoModule", () => {
  test("should list momo providers", async () => {
    const client = createClient();
    const result = await client.momo.list({ country: "SL" });

    expect(result.success).toBe(true);
    expect(result.result).toBeInstanceOf(Array);
  });

  test("should get momo provider", async () => {
    const client = createClient();
    const result = await client.momo.get("m17");

    expect(result.success).toBe(true);
    expect(result.result.providerId).toBe("m17");
  });
});

describe("PaymentModule", () => {
  test("should get payment", async () => {
    const client = createClient();
    const result = await client.payment.get("pay-123");

    expect(result.success).toBe(true);
    expect(result.result.id).toBe("pay-123");
  });

  test("should list payments", async () => {
    const client = createClient();
    const result = await client.payment.list();

    expect(result.success).toBe(true);
    expect(result.result).toBeInstanceOf(Array);
  });

  test("should update payment", async () => {
    const client = createClient();
    const result = await client.payment.update("pay-123", { name: "Updated" });

    expect(result.success).toBe(true);
    expect(result.result.name).toBe("Updated");
  });
});

describe("ReceiptModule", () => {
  test("should get receipt by order number", async () => {
    const client = createClient();
    const result = await client.receipt.get("ORD-123");

    expect(result.success).toBe(true);
    expect(result.result.orderNumber).toBe("ORD-123");
  });

  test("should redeem receipt", async () => {
    const client = createClient();
    const result = await client.receipt.redeem("ORD-123", { redeemAll: true });

    expect(result.success).toBe(true);
  });
});

describe("UssdOtpModule", () => {
  test("should create USSD OTP", async () => {
    const client = createClient();
    const result = await client.ussdOtp.create({
      authorizedPhoneNumber: "23276123456",
    });

    expect(result.success).toBe(true);
    expect(result.result.id).toBeDefined();
  });

  test("should get USSD OTP", async () => {
    const client = createClient();
    const result = await client.ussdOtp.get("otp-123");

    expect(result.success).toBe(true);
    expect(result.result.id).toBe("otp-123");
  });
});
