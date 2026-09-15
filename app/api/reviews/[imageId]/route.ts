import { NextResponse } from "next/server";
import { deleteReview } from "@/lib/blobStore";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params;
  const id = Number(imageId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid imageId" }, { status: 400 });
  }

  try {
    await deleteReview(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
