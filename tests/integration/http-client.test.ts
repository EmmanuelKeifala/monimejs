import { delay, HttpResponse, http } from "msw";
import { describe, expect, test } from "vitest";
import {
  MonimeApiError,
  MonimeTimeoutError,
  MonimeValidationError,
} from "../../src/errors";
import { MonimeHttpClient } from "../../src/http-client";
import type { ClientOptions } from "../../src/types";
import { server } from "../mocks/server";

const BASE_URL = "https://api.monime.io";

function createClient(options: Partial<ClientOptions> = {}) {
  return new MonimeHttpClient({
    spaceId: "spc-test123",
    accessToken: "test-token",
    ...options,
  });
}

describe("MonimeHttpClient", () => {
  describe("constructor", () => {
    test("should create client with required options", () => {
      const client = createClient();
      expect(client).toBeInstanceOf(MonimeHttpClient);
    });

    test("should reject non-HTTPS baseUrl", () => {
      expect(
        () =>
          new MonimeHttpClient({
            spaceId: "spc-test",
            accessToken: "token",
            baseUrl: "http://api.insecure.com",
          }),
      ).toThrow(MonimeValidationError);
    });

    test("should accept custom HTTPS baseUrl", () => {
      const client = new MonimeHttpClient({
        spaceId: "spc-test",
        accessToken: "token",
        baseUrl: "https://api.custom.com",
      });
      expect(client).toBeInstanceOf(MonimeHttpClient);
    });

    test("should validate inputs by default", () => {
      const client = createClient();
      expect(client.should_validate).toBe(true);
    });

    test("should respect validateInputs: false", () => {
      const client = createClient({ validateInputs: false });
      expect(client.should_validate).toBe(false);
    });
  });

  describe("request headers", () => {
    test("should send Authorization and Space-Id headers", async () => {
      let capturedHeaders: Record<string, string> = {};

      server.use(
        http.get(`${BASE_URL}/v1/test`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ success: true, result: {} });
        }),
      );

      const client = createClient();
      await client.request({ method: "GET", path: "/test" });

      expect(capturedHeaders["authorization"]).toBe("Bearer test-token");
      expect(capturedHeaders["monime-space-id"]).toBe("spc-test123");
    });

    test("should set Content-Type for POST requests with body", async () => {
      let contentType: string | null = null;

      server.use(
        http.post(`${BASE_URL}/v1/test`, ({ request }) => {
          contentType = request.headers.get("content-type");
          return HttpResponse.json({ success: true, result: {} });
        }),
      );

      const client = createClient();
      await client.request({
        method: "POST",
        path: "/test",
        body: { name: "test" },
      });

      expect(contentType).toBe("application/json");
    });

    test("should generate idempotency key for POST requests", async () => {
      let idempotencyKey: string | null = null;

      server.use(
        http.post(`${BASE_URL}/v1/test`, ({ request }) => {
          idempotencyKey = request.headers.get("idempotency-key");
          return HttpResponse.json({ success: true, result: {} });
        }),
      );

      const client = createClient();
      await client.request({ method: "POST", path: "/test", body: {} });

      expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    test("should use provided idempotency key", async () => {
      let idempotencyKey: string | null = null;

      server.use(
        http.post(`${BASE_URL}/v1/test`, ({ request }) => {
          idempotencyKey = request.headers.get("idempotency-key");
          return HttpResponse.json({ success: true, result: {} });
        }),
      );

      const client = createClient();
      await client.request({
        method: "POST",
        path: "/test",
        body: {},
        config: { idempotencyKey: "custom-key-123" },
      });

      expect(idempotencyKey).toBe("custom-key-123");
    });
  });

  describe("query parameters", () => {
    test("should append query params to URL", async () => {
      let capturedUrl: string = "";

      server.use(
        http.get(`${BASE_URL}/v1/test`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ success: true, result: [] });
        }),
      );

      const client = createClient();
      await client.request({
        method: "GET",
        path: "/test",
        params: { limit: 10, status: "pending" },
      });

      expect(capturedUrl).toContain("limit=10");
      expect(capturedUrl).toContain("status=pending");
    });

    test("should skip undefined params", async () => {
      let capturedUrl: string = "";

      server.use(
        http.get(`${BASE_URL}/v1/test`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ success: true, result: [] });
        }),
      );

      const client = createClient();
      await client.request({
        method: "GET",
        path: "/test",
        params: { limit: 10, after: undefined },
      });

      expect(capturedUrl).toContain("limit=10");
      expect(capturedUrl).not.toContain("after");
    });
  });

  describe("error handling", () => {
    test("should throw MonimeApiError for 400 response", async () => {
      server.use(
        http.get(`${BASE_URL}/v1/test`, () => {
          return HttpResponse.json(
            {
              success: false,
              messages: [],
              error: {
                code: 400,
                reason: "validation_error",
                message: "Invalid input",
                details: [{ field: "amount" }],
              },
            },
            { status: 400 },
          );
        }),
      );

      const client = createClient();

      try {
        await client.request({ method: "GET", path: "/test" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MonimeApiError);
        if (error instanceof MonimeApiError) {
          expect(error.code).toBe(400);
          expect(error.reason).toBe("validation_error");
        }
      }
    });

    test("should throw MonimeApiError for 500 response", async () => {
      server.use(
        http.get(`${BASE_URL}/v1/test`, () => {
          return HttpResponse.json(
            {
              success: false,
              messages: [],
              error: {
                code: 500,
                reason: "internal_error",
                message: "Server error",
                details: [],
              },
            },
            { status: 500 },
          );
        }),
      );

      const client = createClient({ retries: 0 }); // Disable retries for faster test

      await expect(
        client.request({ method: "GET", path: "/test" }),
      ).rejects.toThrow(MonimeApiError);
    });

    test("should parse Retry-After header", async () => {
      server.use(
        http.get(`${BASE_URL}/v1/test`, () => {
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
      );

      const client = createClient({ retries: 0 });

      try {
        await client.request({ method: "GET", path: "/test" });
      } catch (error) {
        expect(error).toBeInstanceOf(MonimeApiError);
        if (error instanceof MonimeApiError) {
          expect(error.retryAfter).toBe(60000); // Converted to ms
        }
      }
    });

    test("should throw MonimeApiError for invalid JSON response", async () => {
      server.use(
        http.get(`${BASE_URL}/v1/test`, () => {
          return new HttpResponse("Not valid JSON", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      const client = createClient();

      await expect(
        client.request({ method: "GET", path: "/test" }),
      ).rejects.toThrow(MonimeApiError);
    });
  });

  describe("timeout", () => {
    test("should timeout after specified duration", async () => {
      server.use(
        http.get(`${BASE_URL}/v1/test`, async () => {
          await delay(5000); // 5 second delay
          return HttpResponse.json({ success: true });
        }),
      );

      const client = createClient({ timeout: 100 }); // 100ms timeout

      await expect(
        client.request({ method: "GET", path: "/test" }),
      ).rejects.toThrow(MonimeTimeoutError);
    });

    test("should use per-request timeout override", async () => {
      server.use(
        http.get(`${BASE_URL}/v1/test`, async () => {
          await delay(500);
          return HttpResponse.json({ success: true });
        }),
      );

      const client = createClient({ timeout: 5000 }); // 5s default

      await expect(
        client.request({
          method: "GET",
          path: "/test",
          config: { timeout: 100 }, // Override to 100ms
        }),
      ).rejects.toThrow(MonimeTimeoutError);
    });
  });

  describe("abort signal", () => {
    test("should support request cancellation", async () => {
      server.use(
        http.get(`${BASE_URL}/v1/test`, async () => {
          await delay(5000);
          return HttpResponse.json({ success: true });
        }),
      );

      const controller = new AbortController();
      const client = createClient();

      // Abort after 50ms
      setTimeout(() => controller.abort(), 50);

      await expect(
        client.request({
          method: "GET",
          path: "/test",
          config: { signal: controller.signal },
        }),
      ).rejects.toThrow();
    });
  });
});
