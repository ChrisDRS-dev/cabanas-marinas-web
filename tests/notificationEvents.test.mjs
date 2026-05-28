import assert from "node:assert/strict";
import { test } from "node:test";

test("client email implementation has no provider dependency", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/lib/notifications/events.ts", import.meta.url), "utf8"),
  );

  assert.doesNotMatch(source, /resend/i);
  assert.doesNotMatch(source, /gmail\.googleapis/i);
  assert.match(source, /notification_events/);
  assert.match(source, /ADMIN_NOTIFICATIONS_API_URL/);
});

