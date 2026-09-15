import { getStore } from "@netlify/blobs";
import type { ImageReview } from "./reviewTypes";

const STORE_NAME = "dental-reviews";
const KEY = "responses.json";

// In-memory fallback used only when Netlify Blobs isn't configured, i.e.
// running under plain `next dev` outside Netlify's runtime. On an actual
// Netlify deploy, getStore() is always usable and this path is never hit.
// This fallback does NOT persist across server restarts — it exists purely
// so local UI development doesn't hard-fail on this route.
let memoryFallback: Record<number, ImageReview> | null = null;

function store() {
  return getStore(STORE_NAME);
}

export async function loadAllReviews(): Promise<Record<number, ImageReview>> {
  if (memoryFallback) return memoryFallback;
  try {
    const data = await store().get(KEY, { type: "json" });
    return (data as Record<number, ImageReview> | null) ?? {};
  } catch {
    memoryFallback = {};
    return memoryFallback;
  }
}

export async function saveReview(imageId: number, review: ImageReview): Promise<void> {
  if (memoryFallback) {
    memoryFallback[imageId] = review;
    return;
  }
  try {
    const all = await loadAllReviews();
    all[imageId] = review;
    await store().setJSON(KEY, all);
  } catch {
    memoryFallback = { [imageId]: review };
  }
}
