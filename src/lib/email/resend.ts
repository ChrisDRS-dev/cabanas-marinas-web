import { Resend } from "resend";

let cachedClient: Resend | null = null;
let cachedApiKey: string | null = null;

export function getResendClient(apiKey: string) {
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new Resend(apiKey);
    cachedApiKey = apiKey;
  }
  return cachedClient;
}
