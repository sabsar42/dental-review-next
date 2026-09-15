"use client";

import { useCallback, useState } from "react";
import type { ExportRow, ImageReview } from "./reviewTypes";

const REVIEWER_NAME_KEY = "dental-review:reviewer-name";
const RESPONSES_KEY = "dental-review:responses";

function readReviewerName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REVIEWER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function readResponses(): Record<number, ImageReview> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RESPONSES_KEY);
    return raw ? (JSON.parse(raw) as Record<number, ImageReview>) : {};
  } catch {
    return {};
  }
}

function writeResponses(responses: Record<number, ImageReview>) {
  try {
    window.localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — responses stay in memory only
  }
}

export function useReviewerName() {
  const [name, setNameState] = useState(() => readReviewerName());

  const setName = useCallback((value: string) => {
    setNameState(value);
    try {
      window.localStorage.setItem(REVIEWER_NAME_KEY, value);
    } catch {
      // ignore
    }
  }, []);

  return { name, setName };
}

export function getSavedImageReview(imageId: number): ImageReview | null {
  return readResponses()[imageId] ?? null;
}

export function saveImageReview(imageId: number, review: ImageReview) {
  const all = readResponses();
  all[imageId] = review;
  writeResponses(all);
}

export function getAllResponses(): Record<number, ImageReview> {
  return readResponses();
}

export function reviewedImageIds(): Set<number> {
  return new Set(Object.keys(readResponses()).map(Number));
}

export function toExportRows(reviewerName: string): ExportRow[] {
  const all = readResponses();
  const rows: ExportRow[] = [];
  for (const review of Object.values(all)) {
    const issues = Object.values(review.issues).sort((a, b) => a.toothNumber - b.toothNumber);
    const flaggedNumbers = new Set(issues.map((i) => i.toothNumber));

    for (const issue of issues) {
      rows.push({
        reviewer_name: reviewerName,
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
        reviewer_name: reviewerName,
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
