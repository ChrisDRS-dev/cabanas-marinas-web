import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST_SUFFIXES = ["cdninstagram.com", "fbcdn.net"];

function isAllowedImageHost(url: URL) {
  return ALLOWED_HOST_SUFFIXES.some((suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`));
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("src");

  if (!source) {
    return NextResponse.json({ error: "missing_src" }, { status: 400 });
  }

  let imageUrl: URL;

  try {
    imageUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: "invalid_src" }, { status: 400 });
  }

  if (!isAllowedImageHost(imageUrl)) {
    return NextResponse.json({ error: "host_not_allowed" }, { status: 400 });
  }

  const upstream = await fetch(imageUrl.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
    next: { revalidate: 3600 },
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "fetch_failed" }, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
