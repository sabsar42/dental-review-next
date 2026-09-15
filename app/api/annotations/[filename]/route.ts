import { NextResponse } from "next/server";
import { annotationCentroid, assignFdiNumbers, loadCocoData, plainEnglishCategoryName } from "@/lib/hf";
import type { PositionedTooth } from "@/lib/hf";

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

    const imageAnnotations = coco.annotations.filter((ann) => ann.image_id === imageEntry.id);

    const positioned: PositionedTooth[] = [];
    const centroidByAnnotationId = new Map<number, { x: number; y: number } | null>();
    for (const ann of imageAnnotations) {
      const centroid = annotationCentroid(ann);
      centroidByAnnotationId.set(ann.id, centroid);
      if (centroid) {
        positioned.push({
          annotationId: ann.id,
          toothType: categoryNameById.get(ann.category_id) ?? "Not sure",
          centroid,
        });
      }
    }
    const fdiByAnnotationId = assignFdiNumbers(positioned);

    // fall back to a stable sequential number for the rare tooth with no
    // usable centroid (can't be geometrically placed), sorted after all
    // FDI-numbered teeth so numbering stays deterministic
    let fallbackNumber = 100;
    const teeth: ToothAnnotation[] = imageAnnotations
      .map((ann) => ({
        toothNumber: fdiByAnnotationId.get(ann.id) ?? fallbackNumber++,
        annotationId: ann.id,
        toothType: categoryNameById.get(ann.category_id) ?? "Not sure",
        centroid: centroidByAnnotationId.get(ann.id) ?? null,
      }))
      .sort((a, b) => a.toothNumber - b.toothNumber);

    return NextResponse.json(
      {
        imageId: imageEntry.id,
        fileName: imageEntry.file_name,
        width: imageEntry.width,
        height: imageEntry.height,
        teeth,
      },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
