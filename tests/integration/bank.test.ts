import { describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { MonimeClient } from "../../src/client";
import { MonimeApiError, MonimeValidationError } from "../../src/errors";

const BASE_URL = "https://api.monime.io/v1";

function createClient() {
	return new MonimeClient({
		spaceId: "spc-test123",
		accessToken: "test-token",
	});
}

describe("BankModule", () => {
	describe("list", () => {
		test("should list banks for a country", async () => {
			const client = createClient();
			const result = await client.bank.list({ country: "SL" });

			expect(result.success).toBe(true);
			expect(result.result).toBeInstanceOf(Array);
			expect(result.pagination).toBeDefined();
		});

		test("should pass limit parameter", async () => {
			let capturedUrl = "";

			server.use(
				http.get(`${BASE_URL}/banks`, ({ request }) => {
					capturedUrl = request.url;
					return HttpResponse.json({
						success: true,
						messages: [],
						result: [],
						pagination: { count: 0, next: null },
					});
				}),
			);

			const client = createClient();
			await client.bank.list({ country: "SL", limit: 25 });

			expect(capturedUrl).toContain("limit=25");
		});

		test("should validate country code", async () => {
			const client = createClient();

			await expect(client.bank.list({ country: "" })).rejects.toThrow(
				MonimeValidationError,
			);
		});

		test("should validate country is 2 letters", async () => {
			const client = createClient();

			await expect(client.bank.list({ country: "SLE" })).rejects.toThrow(
				MonimeValidationError,
			);
		});
	});

	describe("get", () => {
		test("should get bank by provider ID", async () => {
			const client = createClient();
			const result = await client.bank.get("slcb");

			expect(result.success).toBe(true);
			expect(result.result.providerId).toBe("slcb");
		});

		test("should handle not found error", async () => {
			const client = createClient();

			await expect(client.bank.get("invalid")).rejects.toThrow(MonimeApiError);
		});

		test("should validate provider ID", async () => {
			const client = createClient();

			await expect(client.bank.get("")).rejects.toThrow(MonimeValidationError);
		});
	});
});
