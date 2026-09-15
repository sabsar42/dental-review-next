import { NextResponse } from "next/server";
import { annotationCentroid, loadCocoData, plainEnglishCategoryName } from "@/lib/hf";

export interface ToothAnnotation {
  toothNumber: number;
  annotationId: number;
  toothType: string;
  centroid: { x: number; y: number } | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const decodedName = decodeURIComponent(filename);

  try {
    const coco = await loadCocoData();

    const imageEntry = coco.images.find((img) => img.file_name === decodedName);
    if (!imageEntry) {
      return NextResponse.json({ error: "Image not found in dataset" }, { status: 404 });
    }

    const categoryNameById = new Map<number, string>();
    for (const cat of coco.categories) {
      if (cat.id === 0) continue;
      categoryNameById.set(cat.id, plainEnglishCategoryName(cat.name));
    }

    const teeth: ToothAnnotation[] = coco.annotations
      .filter((ann) => ann.image_id === imageEntry.id)
      .sort((a, b) => a.id - b.id)
      .map((ann, idx) => ({
        toothNumber: idx + 1,
        annotationId: ann.id,
        toothType: categoryNameById.get(ann.category_id) ?? "Not sure",
        centroid: annotationCentroid(ann),
      }));

    return NextResponse.json({
      imageId: imageEntry.id,
      fileName: imageEntry.file_name,
      width: imageEntry.width,
      height: imageEntry.height,
      teeth,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
