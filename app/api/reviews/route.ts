import { NextRequest, NextResponse } from "next/server";
import { loadAllReviews, saveReview } from "@/lib/blobStore";
import type { ImageReview } from "@/lib/reviewTypes";

export async function GET() {
  try {
    const reviews = await loadAllReviews();
    return NextResponse.json({ reviews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const review = (await req.json()) as ImageReview;
    if (typeof review.imageId !== "number") {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }
    await saveReview(review.imageId, review);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
