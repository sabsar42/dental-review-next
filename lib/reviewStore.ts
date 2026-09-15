"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExportRow, ImageReview } from "./reviewTypes";

const REVIEWER_NAME_KEY = "dental-review:reviewer-name";
const RESPONSES_CACHE_KEY = "dental-review:responses-cache";

function readReviewerName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REVIEWER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

// localStorage is used only as an instant-paint cache of the last known
// server state — the server (Netlify Blobs, via /api/reviews) is the source
// of truth so progress survives across browsers, devices, and deploy URLs.
function readCachedResponses(): Record<number, ImageReview> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RESPONSES_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, ImageReview>) : {};
  } catch {
    return {};
  }
}

function writeCachedResponses(responses: Record<number, ImageReview>) {
  try {
    window.localStorage.setItem(RESPONSES_CACHE_KEY, JSON.stringify(responses));
  } catch {
    // best-effort cache only — server round-trip still works without it
  }
}

/**
 * The reviewer name is shared across everyone using the app — stored
 * server-side so it's the same regardless of browser, device, or which
 * deploy URL someone opens. localStorage is only an instant-paint cache
 * while the server fetch is in flight.
 */
export function useReviewerName() {
  const [name, setNameState] = useState(() => readReviewerName());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviewer-name")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled || !res.ok) return;
        setNameState(data.name ?? "");
        try {
          window.localStorage.setItem(REVIEWER_NAME_KEY, data.name ?? "");
        } catch {
          // ignore
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setName = useCallback((value: string) => {
    setNameState(value);
    try {
      window.localStorage.setItem(REVIEWER_NAME_KEY, value);
    } catch {
      // ignore
    }
    fetch("/api/reviewer-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    }).catch(() => {
      // best-effort — the name still updates locally even if the server write fails
    });
  }, []);

  return { name, setName, loaded };
}

/**
 * Loads all saved reviews from the server, seeded instantly from the local
 * cache while the network request is in flight. Returns the live map plus a
 * `saveReview` function that writes through to the server and updates local
 * state + cache immediately.
 */
export function useReviews() {
  const [reviews, setReviews] = useState<Record<number, ImageReview>>(() => readCachedResponses());
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Failed to load saved reviews");
          return;
        }
        setReviews(data.reviews ?? {});
        writeCachedResponses(data.reviews ?? {});
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load saved reviews");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveReview = useCallback(async (imageId: number, review: ImageReview) => {
    setReviews((prev) => {
      const next = { ...prev, [imageId]: review };
      writeCachedResponses(next);
      return next;
    });

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to save review to the server");
    }
  }, []);

  const unmarkReview = useCallback(async (imageId: number) => {
    const previous = reviews;
    setReviews((prev) => {
      const next = { ...prev };
      delete next[imageId];
      writeCachedResponses(next);
      return next;
    });

    const res = await fetch(`/api/reviews/${imageId}`, { method: "DELETE" });
    if (!res.ok) {
      // roll back the optimistic removal so the UI reflects reality
      setReviews(previous);
      writeCachedResponses(previous);
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to unmark review on the server");
    }
  }, [reviews]);

  const resetAll = useCallback(async () => {
    setReviews({});
    writeCachedResponses({});

    const res = await fetch("/api/reset", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to reset on the server");
    }
  }, []);

  return { reviews, loaded, loadError, saveReview, unmarkReview, resetAll };
}

export function toExportRows(reviews: Record<number, ImageReview>): ExportRow[] {
  const rows: ExportRow[] = [];
  for (const review of Object.values(reviews)) {
    const issues = Object.values(review.issues).sort((a, b) => a.toothNumber - b.toothNumber);
    const flaggedNumbers = new Set(issues.map((i) => i.toothNumber));

    for (const issue of issues) {
      rows.push({
        reviewer_name: review.reviewerName,
        image_id: review.imageId,
        image_filename: review.imageFileName,
        tooth_number: issue.toothNumber,
        annotation_id: issue.annotationId,
        tooth_type_assigned: issue.toothTypeAssigned,
        status: issue.reasons.length > 0 ? issue.reasons.join(" + ") : "Not sure",
        suggested_type: issue.reasons.includes("Wrong tooth type") ? issue.suggestedType : "",
        comment: issue.comment,
        missing_teeth: review.missingTeeth,
        missing_description: review.missingTeeth === "Yes" ? review.missingDescription : "",
        phantom_marks: review.phantomMarks,
        phantom_description: review.phantomMarks === "Yes" ? review.phantomDescription : "",
        reviewed_at: review.reviewedAt,
      });
    }

    // one summary row per un-flagged (confirmed correct) tooth, so every
    // marked tooth in the image appears somewhere in the export
    for (const tooth of review.teeth) {
      if (flaggedNumbers.has(tooth.toothNumber)) continue;
      rows.push({
        reviewer_name: review.reviewerName,
        image_id: review.imageId,
        image_filename: review.imageFileName,
        tooth_number: tooth.toothNumber,
        annotation_id: tooth.annotationId,
        tooth_type_assigned: tooth.toothType,
        status: "Correct",
        suggested_type: "",
        comment: "",
        missing_teeth: review.missingTeeth,
        missing_description: review.missingTeeth === "Yes" ? review.missingDescription : "",
        phantom_marks: review.phantomMarks,
        phantom_description: review.phantomMarks === "Yes" ? review.phantomDescription : "",
        reviewed_at: review.reviewedAt,
      });
    }
  }
  return rows;
}
