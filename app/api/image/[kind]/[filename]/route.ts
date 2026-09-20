import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { fetchHfFile, imageRepoPath, overlayRepoPath } from "@/lib/hf";

// Gallery thumbnails only ever display at a few hundred px on screen, but
// the source images are 1024x1024 — serving them full-size wastes ~90% of
// the bytes on mobile. `?w=` resizes + re-encodes as WebP on the server.
const MAX_THUMB_WIDTH = 480;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string; filename: string }> }
) {
  const { kind: rawKind, filename } = await params;
  // path segment, not a query string — the CDN caches by full path, so each
  // kind gets its own distinct, correctly-cached URL
  const kind = rawKind === "overlay" ? "overlay" : "raw";

  const requestedWidth = Number(req.nextUrl.searchParams.get("w"));
  const width =
    Number.isFinite(requestedWidth) && requestedWidth > 0
      ? Math.min(requestedWidth, MAX_THUMB_WIDTH)
      : null;

  const decodedName = decodeURIComponent(filename);
  const repoPath = kind === "overlay" ? overlayRepoPath(decodedName) : imageRepoPath(decodedName);

  let upstream: Response;
  try {
    upstream = await fetchHfFile(repoPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Image not found (${upstream.status})` },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  if (!width) {
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  try {
    const originalBuffer = Buffer.from(await upstream.arrayBuffer());
    const resized = await sharp(originalBuffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    return new NextResponse(new Uint8Array(resized), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resize image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
