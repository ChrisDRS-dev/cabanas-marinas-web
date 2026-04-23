export function normalizeInstagramHandle(value: unknown) {
  if (typeof value !== "string") return "";

  const handle = value.trim().replace(/^@+/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return "";

  return `@${handle}`;
}
