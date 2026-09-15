import { NextResponse } from "next/server";
import { loadCocoData } from "@/lib/hf";

export async function GET() {
  try {
    const coco = await loadCocoData();

    const categoryNameById = new Map<number, string>();
    for (const cat of coco.categories) {
      if (cat.id === 0) continue; // generic "teeth" supercategory placeholder
      categoryNameById.set(cat.id, cat.name);
    }

    const annotationCountByImage = new Map<number, number>();
    for (const ann of coco.annotations) {
      annotationCountByImage.set(
        ann.image_id,
        (annotationCountByImage.get(ann.image_id) ?? 0) + 1
      );
    }

    const images = [...coco.images]
      .sort((a, b) => a.file_name.localeCompare(b.file_name))
      .map((img) => ({
        id: img.id,
        fileName: img.file_name,
        width: img.width,
        height: img.height,
        toothCount: annotationCountByImage.get(img.id) ?? 0,
      }));

    return NextResponse.json({ images });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
