import { describe, expect, test } from "vitest";
import { MonimeValidationError } from "../../src/errors";
import {
  ClientOptionsSchema,
  IdSchema,
  LimitSchema,
  validate,
} from "../../src/validation";

describe("validate function", () => {
  test("should pass for valid data", () => {
    expect(() => validate(IdSchema, "pmc-123")).not.toThrow();
  });

  test("should throw MonimeValidationError for invalid data", () => {
    expect(() => validate(IdSchema, "")).toThrow(MonimeValidationError);
  });

  test("should include field path in error", () => {
    try {
      validate(IdSchema, "");
    } catch (error) {
      expect(error).toBeInstanceOf(MonimeValidationError);
      if (error instanceof MonimeValidationError) {
        expect(error.issues.length).toBeGreaterThan(0);
      }
    }
  });

  test("should handle nested field validation", () => {
    const schema = ClientOptionsSchema;
    try {
      validate(schema, { spaceId: "", accessToken: "token" });
    } catch (error) {
      expect(error).toBeInstanceOf(MonimeValidationError);
      if (error instanceof MonimeValidationError) {
        expect(error.issues.some((i) => i.field.includes("spaceId"))).toBe(
          true,
        );
      }
    }
  });
});

describe("IdSchema", () => {
  test("should accept non-empty string", () => {
    expect(() => validate(IdSchema, "pmc-123")).not.toThrow();
    expect(() => validate(IdSchema, "whk-abc")).not.toThrow();
    expect(() => validate(IdSchema, "pay-xyz")).not.toThrow();
  });

  test("should reject empty string", () => {
    expect(() => validate(IdSchema, "")).toThrow(MonimeValidationError);
  });
});

describe("LimitSchema", () => {
  test("should accept valid limits", () => {
    expect(() => validate(LimitSchema, 1)).not.toThrow();
    expect(() => validate(LimitSchema, 25)).not.toThrow();
    expect(() => validate(LimitSchema, 50)).not.toThrow();
  });

  test("should accept undefined (optional)", () => {
    expect(() => validate(LimitSchema, undefined)).not.toThrow();
  });

  test("should reject limit below 1", () => {
    expect(() => validate(LimitSchema, 0)).toThrow(MonimeValidationError);
  });

  test("should reject limit above 50", () => {
    expect(() => validate(LimitSchema, 51)).toThrow(MonimeValidationError);
  });

  test("should reject non-integer", () => {
    expect(() => validate(LimitSchema, 10.5)).toThrow(MonimeValidationError);
  });
});

describe("ClientOptionsSchema", () => {
  test("should accept valid options", () => {
    const options = {
      spaceId: "spc-test123",
      accessToken: "token-abc",
    };
    expect(() => validate(ClientOptionsSchema, options)).not.toThrow();
  });

  test("should accept options with all optional fields", () => {
    const options = {
      spaceId: "spc-test123",
      accessToken: "token-abc",
      baseUrl: "https://api.custom.com",
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      retryBackoff: 2,
      validateInputs: false,
    };
    expect(() => validate(ClientOptionsSchema, options)).not.toThrow();
  });

  test("should reject missing spaceId", () => {
    const options = { accessToken: "token-abc" };
    expect(() => validate(ClientOptionsSchema, options)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject missing accessToken", () => {
    const options = { spaceId: "spc-test" };
    expect(() => validate(ClientOptionsSchema, options)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject empty spaceId", () => {
    const options = { spaceId: "", accessToken: "token" };
    expect(() => validate(ClientOptionsSchema, options)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject empty accessToken", () => {
    const options = { spaceId: "spc-test", accessToken: "" };
    expect(() => validate(ClientOptionsSchema, options)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject negative timeout", () => {
    const options = {
      spaceId: "spc-test",
      accessToken: "token",
      timeout: -1000,
    };
    expect(() => validate(ClientOptionsSchema, options)).toThrow(
      MonimeValidationError,
    );
  });

  test("should reject negative retries", () => {
    const options = { spaceId: "spc-test", accessToken: "token", retries: -1 };
    expect(() => validate(ClientOptionsSchema, options)).toThrow(
      MonimeValidationError,
    );
  });
});
