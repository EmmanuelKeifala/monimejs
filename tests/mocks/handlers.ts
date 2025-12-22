import { delay, HttpResponse, http } from "msw";

const BASE_URL = "https://api.monime.io/v1";

// Sample response data
const sampleBank = {
  id: "bnk-123",
  name: "Sierra Leone Commercial Bank",
  providerId: "slcb",
  country: "SL",
  status: "active",
  capabilities: ["payouts"],
  createTime: "2024-01-01T00:00:00Z",
};

const samplePaymentCode = {
  id: "pmc-123",
  mode: "one_time",
  status: "pending",
  name: "Test Payment",
  amount: { currency: "SLE", value: 1000 },
  enable: true,
  expireTime: "2025-01-01T00:00:00Z",
  ussdCode: "*715*12345#",
  authorizedPhoneNumber: "",
  createTime: "2024-01-01T00:00:00Z",
};

const samplePayout = {
  id: "pyt-123",
  status: "pending",
  amount: { currency: "SLE", value: 5000 },
  source: { financialAccountId: "fa-123" },
  destination: { type: "momo", providerId: "m17", phoneNumber: "23276123456" },
  createTime: "2024-01-01T00:00:00Z",
};

const sampleWebhook = {
  id: "whk-123",
  name: "Test Webhook",
  url: "https://example.com/webhook",
  apiRelease: "caph",
  events: ["payment.completed"],
  enabled: true,
  createTime: "2024-01-01T00:00:00Z",
};

export const handlers = [
  // Bank endpoints
  http.get(`${BASE_URL}/banks`, ({ request }) => {
    const url = new URL(request.url);
    const country = url.searchParams.get("country");

    if (!country) {
      return HttpResponse.json(
        {
          success: false,
          messages: [],
          error: {
            code: 400,
            reason: "validation_error",
            message: "country is required",
            details: [],
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({
      success: true,
      messages: [],
      result: [sampleBank],
      pagination: { count: 1, next: null },
    });
  }),

  http.get(`${BASE_URL}/banks/:providerId`, ({ params }) => {
    const { providerId } = params;

    if (providerId === "invalid") {
      return HttpResponse.json(
        {
          success: false,
          messages: [],
          error: {
            code: 404,
            reason: "not_found",
            message: "Bank not found",
            details: [],
          },
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...sampleBank, providerId },
    });
  }),

  // Payment Code endpoints
  http.post(`${BASE_URL}/payment-codes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...samplePaymentCode, name: body.name ?? "Test Payment" },
    });
  }),

  http.get(`${BASE_URL}/payment-codes/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...samplePaymentCode, id: params.id },
    });
  }),

  http.get(`${BASE_URL}/payment-codes`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [samplePaymentCode],
      pagination: { count: 1, next: null },
    });
  }),

  http.patch(`${BASE_URL}/payment-codes/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...samplePaymentCode, id: params.id, ...body },
    });
  }),

  http.delete(`${BASE_URL}/payment-codes/:id`, () => {
    return HttpResponse.json({ success: true, messages: [] });
  }),

  // Payout endpoints
  http.post(`${BASE_URL}/payouts`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...samplePayout, ...body },
    });
  }),

  http.get(`${BASE_URL}/payouts/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...samplePayout, id: params.id },
    });
  }),

  http.get(`${BASE_URL}/payouts`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [samplePayout],
      pagination: { count: 1, next: null },
    });
  }),

  // Webhook endpoints
  http.post(`${BASE_URL}/webhooks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...sampleWebhook, ...body },
    });
  }),

  http.get(`${BASE_URL}/webhooks/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: { ...sampleWebhook, id: params.id },
    });
  }),

  http.get(`${BASE_URL}/webhooks`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [sampleWebhook],
      pagination: { count: 1, next: null },
    });
  }),

  http.delete(`${BASE_URL}/webhooks/:id`, () => {
    return HttpResponse.json({ success: true, messages: [] });
  }),

  // Checkout Session endpoints
  http.post(`${BASE_URL}/checkout-sessions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: "cs-123",
        status: "pending",
        name: body.name ?? "Checkout",
        orderNumber: "ORD-123",
        redirectUrl: "https://checkout.monime.io/cs-123",
        lineItems: { data: body.lineItems ?? [] },
        expireTime: "2025-01-01T00:00:00Z",
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/checkout-sessions/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: params.id,
        status: "pending",
        name: "Checkout",
        orderNumber: "ORD-123",
        redirectUrl: "https://checkout.monime.io/cs-123",
        lineItems: { data: [] },
        expireTime: "2025-01-01T00:00:00Z",
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/checkout-sessions`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [],
      pagination: { count: 0, next: null },
    });
  }),

  // Financial Account endpoints
  http.post(`${BASE_URL}/financial-accounts`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: "fa-123",
        name: body.name ?? "Account",
        currency: body.currency ?? "SLE",
        balance: { currency: "SLE", value: 0 },
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/financial-accounts/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: params.id,
        name: "Account",
        currency: "SLE",
        balance: { currency: "SLE", value: 10000 },
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/financial-accounts`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [],
      pagination: { count: 0, next: null },
    });
  }),

  http.patch(
    `${BASE_URL}/financial-accounts/:id`,
    async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        success: true,
        messages: [],
        result: {
          id: params.id,
          name: body.name ?? "Account",
          currency: "SLE",
          balance: { currency: "SLE", value: 10000 },
          createTime: "2024-01-01T00:00:00Z",
        },
      });
    },
  ),

  // Financial Transaction endpoints
  http.get(`${BASE_URL}/financial-transactions/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: params.id,
        type: "credit",
        amount: { currency: "SLE", value: 1000 },
        financialAccountId: "fa-123",
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/financial-transactions`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [],
      pagination: { count: 0, next: null },
    });
  }),

  // Internal Transfer endpoints
  http.post(`${BASE_URL}/internal-transfers`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: "it-123",
        status: "completed",
        amount: body.amount ?? { currency: "SLE", value: 1000 },
        sourceFinancialAccount: body.sourceFinancialAccount,
        destinationFinancialAccount: body.destinationFinancialAccount,
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/internal-transfers/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: params.id,
        status: "completed",
        amount: { currency: "SLE", value: 1000 },
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/internal-transfers`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [],
      pagination: { count: 0, next: null },
    });
  }),

  // Momo endpoints
  http.get(`${BASE_URL}/momos`, ({ request }) => {
    const url = new URL(request.url);
    const country = url.searchParams.get("country");

    if (!country) {
      return HttpResponse.json(
        {
          success: false,
          messages: [],
          error: {
            code: 400,
            reason: "validation_error",
            message: "country is required",
            details: [],
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({
      success: true,
      messages: [],
      result: [
        {
          providerId: "m17",
          name: "Africell",
          country: "SL",
          status: "active",
        },
      ],
      pagination: { count: 1, next: null },
    });
  }),

  http.get(`${BASE_URL}/momos/:providerId`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        providerId: params.providerId,
        name: "Africell",
        country: "SL",
        status: "active",
      },
    });
  }),

  // Payments endpoints
  http.get(`${BASE_URL}/payments/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: params.id,
        status: "completed",
        amount: { currency: "SLE", value: 1000 },
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/payments`, () => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: [],
      pagination: { count: 0, next: null },
    });
  }),

  http.patch(`${BASE_URL}/payments/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: params.id,
        status: "completed",
        name: body.name,
        amount: { currency: "SLE", value: 1000 },
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  // Receipt endpoints
  http.get(`${BASE_URL}/receipts/:orderNumber`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        orderNumber: params.orderNumber,
        status: "active",
        entitlements: [],
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.post(`${BASE_URL}/receipts/:orderNumber/redeem`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        orderNumber: params.orderNumber,
        status: "redeemed",
        entitlements: [],
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  // USSD OTP endpoints
  http.post(`${BASE_URL}/ussd-otps`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: "otp-123",
        status: "pending",
        authorizedPhoneNumber: body.authorizedPhoneNumber,
        ussdCode: "*715*123#",
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),

  http.get(`${BASE_URL}/ussd-otps/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      messages: [],
      result: {
        id: params.id,
        status: "verified",
        authorizedPhoneNumber: "23276123456",
        ussdCode: "*715*123#",
        createTime: "2024-01-01T00:00:00Z",
      },
    });
  }),
];

// Error response handlers for testing error scenarios
export const errorHandlers = {
  serverError: http.get(`${BASE_URL}/test-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        messages: [],
        error: {
          code: 500,
          reason: "internal_error",
          message: "Internal server error",
          details: [],
        },
      },
      { status: 500 },
    );
  }),

  rateLimited: http.get(`${BASE_URL}/test-rate-limit`, () => {
    return HttpResponse.json(
      {
        success: false,
        messages: [],
        error: {
          code: 429,
          reason: "rate_limited",
          message: "Too many requests",
          details: [],
        },
      },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }),

  timeout: http.get(`${BASE_URL}/test-timeout`, async () => {
    await delay(10000); // 10 second delay
    return HttpResponse.json({ success: true });
  }),

  invalidJson: http.get(`${BASE_URL}/test-invalid-json`, () => {
    return new HttpResponse("Not valid JSON", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
};
