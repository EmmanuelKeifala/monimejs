/**
 * Webhook Signature Verification Examples
 *
 * This file demonstrates how to verify webhook signatures from Monime
 * to ensure requests are authentic and haven't been tampered with.
 *
 */

import { WebhookVerification, WebhookVerificationError } from "monimejs";

// ============================================================================
// Express.js Example
// ============================================================================

/**
 * Express.js webhook handler with signature verification.
 *
 * IMPORTANT: Use express.raw() middleware to get the raw body,
 * as JSON parsing may modify the payload and break verification.
 */
async function expressWebhookHandler(req, res) {
  const signatureHeader = req.headers["x-monime-signature"];
  const webhookSecret = process.env.MONIME_WEBHOOK_SECRET;

  // Verify the signature
  try {
    const isValid = WebhookVerification.verify({
      payload: req.body, // Raw body from express.raw()
      signatureHeader,
      secret: webhookSecret,
    });

    if (!isValid) {
      console.error("Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error("Webhook verification failed:", error.message);
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }

  // Parse the verified payload
  const event = JSON.parse(req.body.toString());

  // Handle the event based on type
  switch (event.type) {
    case "payment.completed":
      console.log("Payment completed:", event.data.id);
      // Process successful payment...
      break;

    case "payment.failed":
      console.log("Payment failed:", event.data.id);
      // Handle failed payment...
      break;

    case "payout.completed":
      console.log("Payout completed:", event.data.id);
      // Process successful payout...
      break;

    case "payout.failed":
      console.log("Payout failed:", event.data.id);
      // Handle failed payout...
      break;

    default:
      console.log("Unhandled event type:", event.type);
  }

  // Acknowledge receipt (do this quickly!)
  res.status(200).json({ received: true });
}

// Express route setup
// app.post(
//   "/webhooks/monime",
//   express.raw({ type: "application/json" }),
//   expressWebhookHandler
// );

// ============================================================================
// Next.js API Route Example (App Router)
// ============================================================================

/**
 * Next.js App Router webhook handler.
 */
async function nextjsWebhookHandler(request) {
  const signatureHeader = request.headers.get("x-monime-signature");
  const webhookSecret = process.env.MONIME_WEBHOOK_SECRET;

  // Get raw body as text
  const payload = await request.text();

  try {
    const isValid = WebhookVerification.verify({
      payload,
      signatureHeader,
      secret: webhookSecret,
    });

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and process the event
  const event = JSON.parse(payload);
  console.log("Received event:", event.type);

  // Process event...

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================================================
// Custom Tolerance Example
// ============================================================================

/**
 * Verify with custom timestamp tolerance.
 *
 * By default, signatures older than 5 minutes (300 seconds) are rejected.
 * You can customize this for your use case.
 */
function verifyWithCustomTolerance(payload, signatureHeader, secret) {
  const isValid = WebhookVerification.verify({
    payload,
    signatureHeader,
    secret,
    // Accept signatures up to 10 minutes old
    tolerance: 600,
  });

  return isValid;
}

// ============================================================================
// ES256 (ECDSA) Verification Example
// ============================================================================

/**
 * Verify webhooks using ES256 (ECDSA P-256) signatures.
 *
 * ES256 uses asymmetric cryptography - Monime signs with a private key
 * and you verify with the public key.
 */
function verifyES256Webhook(payload, signatureHeader) {
  const publicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
-----END PUBLIC KEY-----`;

  const isValid = WebhookVerification.verify({
    payload,
    signatureHeader,
    publicKey,
  });

  return isValid;
}

// ============================================================================
// Error Handling Example
// ============================================================================

/**
 * Comprehensive error handling for webhook verification.
 */
function handleWebhookWithErrorHandling(payload, signatureHeader, secret) {
  try {
    const isValid = WebhookVerification.verify({
      payload,
      signatureHeader,
      secret,
    });

    if (!isValid) {
      // Signature doesn't match - possible tampering
      return { success: false, error: "INVALID_SIGNATURE" };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      // Known verification error
      if (error.message.includes("too old")) {
        // Signature expired - possible replay attack
        return { success: false, error: "SIGNATURE_EXPIRED" };
      }
      if (error.message.includes("future")) {
        // Clock skew issue
        return { success: false, error: "CLOCK_SKEW" };
      }
      if (error.message.includes("Invalid signature header")) {
        // Malformed header
        return { success: false, error: "MALFORMED_HEADER" };
      }
      return { success: false, error: "VERIFICATION_FAILED" };
    }

    // Unexpected error
    throw error;
  }
}
