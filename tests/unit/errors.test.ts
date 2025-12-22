import { describe, expect, test } from "vitest";
import {
	MonimeApiError,
	MonimeError,
	MonimeNetworkError,
	MonimeTimeoutError,
	MonimeValidationError,
} from "../../src/errors";

describe("MonimeError", () => {
	test("should create error with message", () => {
		const error = new MonimeError("Test error");
		expect(error.message).toBe("Test error");
		expect(error.name).toBe("MonimeError");
		expect(error).toBeInstanceOf(Error);
	});

	test("should have correct prototype chain", () => {
		const error = new MonimeError("Test");
		expect(error instanceof MonimeError).toBe(true);
		expect(error instanceof Error).toBe(true);
	});
});

describe("MonimeApiError", () => {
	test("should create API error with all properties", () => {
		const error = new MonimeApiError("Payment failed", 400, "invalid_amount", [
			{ field: "amount", message: "Must be positive" },
		]);

		expect(error.message).toBe("Payment failed");
		expect(error.code).toBe(400);
		expect(error.reason).toBe("invalid_amount");
		expect(error.details).toHaveLength(1);
		expect(error.name).toBe("MonimeApiError");
	});

	test("should store retryAfter value", () => {
		const error = new MonimeApiError("Rate limited", 429, "rate_limited", [], 5000);
		expect(error.retryAfter).toBe(5000);
	});

	test("should not have retryAfter if not provided", () => {
		const error = new MonimeApiError("Error", 400, "error", []);
		expect(error.retryAfter).toBeUndefined();
	});

	describe("isRetryable", () => {
		test("should be true for 429 (rate limit)", () => {
			expect(new MonimeApiError("", 429, "", []).isRetryable).toBe(true);
		});

		test("should be true for 500 (internal error)", () => {
			expect(new MonimeApiError("", 500, "", []).isRetryable).toBe(true);
		});

		test("should be true for 502 (bad gateway)", () => {
			expect(new MonimeApiError("", 502, "", []).isRetryable).toBe(true);
		});

		test("should be true for 503 (service unavailable)", () => {
			expect(new MonimeApiError("", 503, "", []).isRetryable).toBe(true);
		});

		test("should be true for 504 (gateway timeout)", () => {
			expect(new MonimeApiError("", 504, "", []).isRetryable).toBe(true);
		});

		test("should be false for 400 (bad request)", () => {
			expect(new MonimeApiError("", 400, "", []).isRetryable).toBe(false);
		});

		test("should be false for 401 (unauthorized)", () => {
			expect(new MonimeApiError("", 401, "", []).isRetryable).toBe(false);
		});

		test("should be false for 403 (forbidden)", () => {
			expect(new MonimeApiError("", 403, "", []).isRetryable).toBe(false);
		});

		test("should be false for 404 (not found)", () => {
			expect(new MonimeApiError("", 404, "", []).isRetryable).toBe(false);
		});
	});

	test("should extend MonimeError", () => {
		const error = new MonimeApiError("Test", 400, "test", []);
		expect(error instanceof MonimeError).toBe(true);
	});
});

describe("MonimeTimeoutError", () => {
	test("should create timeout error with context", () => {
		const error = new MonimeTimeoutError(30000, "https://api.monime.io/v1/test");
		expect(error.timeout).toBe(30000);
		expect(error.url).toBe("https://api.monime.io/v1/test");
		expect(error.name).toBe("MonimeTimeoutError");
	});

	test("should include timeout and url in message", () => {
		const error = new MonimeTimeoutError(5000, "https://api.example.com/test");
		expect(error.message).toContain("5000ms");
		expect(error.message).toContain("https://api.example.com/test");
	});

	test("should extend MonimeError", () => {
		const error = new MonimeTimeoutError(1000, "url");
		expect(error instanceof MonimeError).toBe(true);
	});
});

describe("MonimeValidationError", () => {
	test("should create validation error with single issue", () => {
		const error = new MonimeValidationError("Invalid email format", [
			{ message: "Invalid email format", field: "email", value: "not-an-email" },
		]);

		expect(error.message).toBe("Invalid email format");
		expect(error.issues).toHaveLength(1);
		expect(error.issues[0]?.field).toBe("email");
		expect(error.issues[0]?.value).toBe("not-an-email");
		expect(error.name).toBe("MonimeValidationError");
	});

	test("should handle multiple validation issues", () => {
		const error = new MonimeValidationError("Validation failed with 2 errors", [
			{ message: "Name is required", field: "name" },
			{ message: "Amount must be positive", field: "amount.value", value: -100 },
		]);

		expect(error.issues).toHaveLength(2);
		expect(error.issues[0]?.field).toBe("name");
		expect(error.issues[1]?.field).toBe("amount.value");
	});

	test("should extend MonimeError", () => {
		const error = new MonimeValidationError("Test", []);
		expect(error instanceof MonimeError).toBe(true);
	});
});

describe("MonimeNetworkError", () => {
	test("should create network error with cause", () => {
		const cause = new TypeError("fetch failed");
		const error = new MonimeNetworkError("Connection failed", cause);

		expect(error.message).toBe("Connection failed");
		expect(error.cause).toBe(cause);
		expect(error.name).toBe("MonimeNetworkError");
	});

	test("should work without cause", () => {
		const error = new MonimeNetworkError("Network error");
		expect(error.message).toBe("Network error");
		expect(error.cause).toBeUndefined();
	});

	test("should always be retryable", () => {
		const error = new MonimeNetworkError("Connection reset");
		expect(error.isRetryable).toBe(true);
	});

	test("should extend MonimeError", () => {
		const error = new MonimeNetworkError("Test");
		expect(error instanceof MonimeError).toBe(true);
	});
});
