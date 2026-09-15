import { NextRequest, NextResponse } from "next/server";
import { loadReviewerName, saveReviewerName } from "@/lib/blobStore";

export async function GET() {
  try {
    const name = await loadReviewerName();
    return NextResponse.json({ name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = (await req.json()) as { name?: string };
    if (typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    await saveReviewerName(name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
