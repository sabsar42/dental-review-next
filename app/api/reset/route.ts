import { NextResponse } from "next/server";
import { resetAll } from "@/lib/blobStore";

export async function POST() {
  try {
    await resetAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
