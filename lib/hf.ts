// Server-only helpers for talking to a private Hugging Face dataset repo.
// Never import this from client components — it reads process.env.HF_TOKEN.

const HF_REPO_ID = "sabsar42/dental-annotated-test-dataset-review";
const HF_REPO_TYPE = "datasets";
const HF_BASE = `https://huggingface.co/${HF_REPO_TYPE}/${HF_REPO_ID}/resolve/main`;

function authHeaders(): HeadersInit {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error("HF_TOKEN environment variable is not set on the server");
  }
  return { Authorization: `Bearer ${token}` };
}

export function hfFileUrl(pathInRepo: string): string {
  return `${HF_BASE}/${pathInRepo}`;
}

export async function fetchHfFile(pathInRepo: string): Promise<Response> {
  return fetch(hfFileUrl(pathInRepo), {
    headers: authHeaders(),
    cache: "no-store",
  });
}

export async function headHfFile(pathInRepo: string): Promise<Response> {
  return fetch(hfFileUrl(pathInRepo), {
    method: "HEAD",
    headers: authHeaders(),
    cache: "no-store",
  });
}

// ---- COCO annotation types (subset of fields we actually use) -------------

export interface CocoCategory {
  id: number;
  name: string;
  supercategory?: string;
}

export interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number];
  area: number;
  segmentation: string | number[][];
}

export interface CocoData {
  categories: CocoCategory[];
  images: CocoImage[];
  annotations: CocoAnnotation[];
}

const PATHS = {
  images: "test_prepared/images",
  overlays: "test_prepared/masks_overlay",
  annotations: "test_prepared/_annotations.coco.json",
  classDict: "test_prepared/class_dict.csv",
};

export { PATHS };

let cachedCoco: CocoData | null = null;

export async function loadCocoData(): Promise<CocoData> {
  if (cachedCoco) return cachedCoco;

  const res = await fetchHfFile(PATHS.annotations);
  if (!res.ok) {
    throw new Error(`Failed to load annotations from Hugging Face: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as CocoData;
  cachedCoco = data;
  return data;
}

export function imageRepoPath(fileName: string): string {
  return `${PATHS.images}/${fileName}`;
}

export function overlayRepoPath(fileName: string): string {
  const stem = fileName.replace(/\.[^/.]+$/, "");
  return `${PATHS.overlays}/${stem}.png`;
}

// ---- Plain-English category names -----------------------------------------
// Never expose raw category names or ML terminology to reviewers.

const PLAIN_NAME: Record<string, string> = {
  "1st_molar": "First Molar",
  "2nd_molar": "Second Molar",
  "3rd_molar": "Third Molar",
  "1st_premolar": "First Premolar",
  "2nd_premolar": "Second Premolar",
  canine: "Canine",
  central_incisor: "Central Incisor",
  lateral_incisor: "Lateral Incisor",
};

export function plainEnglishCategoryName(rawName: string): string {
  if (PLAIN_NAME[rawName]) return PLAIN_NAME[rawName];
  return rawName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- Segmentation / centroid helpers ---------------------------------------

function parseSegmentation(seg: CocoAnnotation["segmentation"]): number[][] {
  if (seg == null) return [];
  let value: unknown = seg;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  // could be a flat polygon (number[]) or a list of polygons (number[][])
  if (value.length > 0 && typeof value[0] === "number") {
    return [value as number[]];
  }
  return value as number[][];
}

export function annotationCentroid(ann: CocoAnnotation): { x: number; y: number } | null {
  for (const poly of parseSegmentation(ann.segmentation)) {
    const xs = poly.filter((_, i) => i % 2 === 0);
    const ys = poly.filter((_, i) => i % 2 === 1);
    if (xs.length === 0) continue;
    return {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }
  if (ann.bbox && ann.bbox.length === 4) {
    const [x, y, w, h] = ann.bbox;
    return { x: x + w / 2, y: y + h / 2 };
  }
  return null;
}
