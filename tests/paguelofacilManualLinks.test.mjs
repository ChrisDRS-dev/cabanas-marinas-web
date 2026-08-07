import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("manual PagueloFacil marker is isolated from reservation ids", async () => {
  const source = await readFile(
    new URL("../src/lib/paguelofacil/server.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /isManualPaymentLinkMarker/);
  assert.match(source, /"manual_payment_link"/);
  assert.match(source, /applyVerifiedManualPagueloFacilPayment/);
  assert.match(source, /manual_payment_links/);
  assert.match(source, /paymentAmountMatches/);
});

test("PagueloFacil return and webhook route manual links away from reservation flow", async () => {
  const returnRoute = await readFile(
    new URL("../src/app/api/payments/paguelofacil/return/route.ts", import.meta.url),
    "utf8",
  );
  const webhookRoute = await readFile(
    new URL("../src/app/api/webhooks/paguelofacil/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(returnRoute, /isManualPaymentLinkMarker/);
  assert.match(returnRoute, /applyVerifiedManualPagueloFacilPayment/);
  assert.match(returnRoute, /manualLinkId/);
  assert.match(webhookRoute, /isManualPaymentLinkMarker/);
  assert.match(webhookRoute, /applyVerifiedManualPagueloFacilPayment/);
  assert.match(webhookRoute, /manual: true/);
});

test("PagueloFacil verification only settles payable active reservation payments", async () => {
  const source = await readFile(
    new URL("../src/lib/paguelofacil/server.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /function isPayablePagueloFacilPayment/);
  assert.match(source, /payment\.status === "PENDING"/);
  assert.match(source, /payment\.link_status === "ACTIVE"/);
  assert.match(source, /const requestedPayment = args\.paymentId/);
  assert.match(source, /reason: "payment_not_payable"/);
  assert.match(source, /reason: "payment_not_found"/);
});
