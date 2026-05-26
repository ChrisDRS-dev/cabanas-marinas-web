import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEmailIdempotencyKey,
  parseAdminNotificationEmails,
  shouldSkipRecipient,
} from "../src/lib/email/config.ts";

test("parseAdminNotificationEmails trims, lowercases, and removes duplicates", () => {
  assert.deepEqual(
    parseAdminNotificationEmails(" Admin@Example.com,staff@example.com, admin@example.com ,, "),
    ["admin@example.com", "staff@example.com"]
  );
});

test("buildEmailIdempotencyKey is stable for repeated event delivery", () => {
  assert.equal(
    buildEmailIdempotencyKey({
      appSource: "client",
      eventKey: "payment.link.generated",
      template: "PaymentLinkEmail",
      toEmail: "Cliente@Example.com",
      reservationId: "res-123",
      paymentId: "pay-456",
    }),
    "client:payment.link.generated:PaymentLinkEmail:cliente@example.com:res-123:pay-456"
  );
});

test("shouldSkipRecipient treats missing or malformed emails as skipped", () => {
  assert.equal(shouldSkipRecipient(null), true);
  assert.equal(shouldSkipRecipient("not-an-email"), true);
  assert.equal(shouldSkipRecipient("client@example.com"), false);
});
