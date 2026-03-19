import { NextResponse } from "next/server";
import { getYappyButtonConfig } from "@/lib/yappy-button";

const DEFAULT_CDN_URL =
  "https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const config = getYappyButtonConfig(url.origin);

    return NextResponse.json({
      enabled: true,
      cdnUrl: config.cdnUrl,
    });
  } catch (error) {
    return NextResponse.json({
      enabled: false,
      cdnUrl: process.env.YAPPY_BUTTON_CDN_URL?.trim() || DEFAULT_CDN_URL,
      reason:
        process.env.NODE_ENV === "production"
          ? "configuration_error"
          : error instanceof Error
          ? error.message
          : "configuration_error",
    });
  }
}
