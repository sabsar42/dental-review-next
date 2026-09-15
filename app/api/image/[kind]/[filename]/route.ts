import { NextResponse } from "next/server";
import { fetchHfFile, imageRepoPath, overlayRepoPath } from "@/lib/hf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; filename: string }> }
) {
  const { kind: rawKind, filename } = await params;
  // path segment, not a query string — the CDN caches by full path, so each
  // kind gets its own distinct, correctly-cached URL
  const kind = rawKind === "overlay" ? "overlay" : "raw";

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

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
