"use client";

import { useEffect, useState } from "react";
import ImageCard from "./ImageCard";
import { toExportRows, useReviewerName, useReviews } from "@/lib/reviewStore";
import { downloadResponsesAsExcel } from "@/lib/excelExport";

export interface DatasetImage {
  id: number;
  fileName: string;
  width: number;
  height: number;
  toothCount: number;
}

export default function ImageGallery() {
  const [images, setImages] = useState<DatasetImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { name: reviewerName, setName: setReviewerName } = useReviewerName();
  const { reviews, loadError: reviewsError, saveReview, unmarkReview } = useReviews();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function handleDownloadAll() {
    const rows = toExportRows(reviews);
    if (rows.length === 0) {
      alert("No responses saved yet. Review at least one image first.");
      return;
    }
    await downloadResponsesAsExcel(rows);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dataset")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load dataset");
          return;
        }
        setImages(data.images);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dataset");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Could not load the dataset: {error}
        </div>
      </div>
    );
  }

  if (!images) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            Reviewer name:
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Enter your name"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <span className="text-sm text-slate-500 dark:text-slate-400">{today}</span>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {images.length} image{images.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={handleDownloadAll}
          className="rounded-lg border border-teal-600 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50 dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-950/40"
        >
          Download responses (Excel)
        </button>
      </div>

      {reviewsError && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Could not load saved reviews from the server ({reviewsError}). Showing locally cached progress only.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, idx) => (
          <ImageCard
            key={img.id}
            image={img}
            displayNumber={idx + 1}
            savedReview={reviews[img.id] ?? null}
            reviewerName={reviewerName}
            onSave={saveReview}
            onUnmark={unmarkReview}
          />
        ))}
      </div>
    </div>
  );
}
