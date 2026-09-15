import { getStore } from "@netlify/blobs";
import type { ImageReview } from "./reviewTypes";

const STORE_NAME = "dental-reviews";
const KEY = "responses.json";
const REVIEWER_NAME_KEY = "reviewer-name.txt";

// In-memory fallback used only when Netlify Blobs isn't configured, i.e.
// running under plain `next dev` outside Netlify's runtime. On an actual
// Netlify deploy, getStore() is always usable and this path is never hit.
// This fallback does NOT persist across server restarts — it exists purely
// so local UI development doesn't hard-fail on this route.
let memoryFallback: Record<number, ImageReview> | null = null;
let memoryReviewerName: string | null = null;

function store() {
  return getStore(STORE_NAME);
}

export async function loadReviewerName(): Promise<string> {
  if (memoryReviewerName !== null) return memoryReviewerName;
  try {
    const name = await store().get(REVIEWER_NAME_KEY, { type: "text" });
    return name ?? "";
  } catch {
    memoryReviewerName = "";
    return memoryReviewerName;
  }
}

export async function saveReviewerName(name: string): Promise<void> {
  if (memoryReviewerName !== null) {
    memoryReviewerName = name;
    return;
  }
  try {
    await store().set(REVIEWER_NAME_KEY, name);
  } catch {
    memoryReviewerName = name;
  }
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

export async function deleteReview(imageId: number): Promise<void> {
  if (memoryFallback) {
    delete memoryFallback[imageId];
    return;
  }
  try {
    const all = await loadAllReviews();
    delete all[imageId];
    await store().setJSON(KEY, all);
  } catch {
    // nothing to fall back to — if Blobs is unreachable there's nothing saved anyway
  }
}
