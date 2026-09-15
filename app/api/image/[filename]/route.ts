import { NextRequest, NextResponse } from "next/server";
import { fetchHfFile, imageRepoPath, overlayRepoPath } from "@/lib/hf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const kind = req.nextUrl.searchParams.get("kind") === "overlay" ? "overlay" : "raw";

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
