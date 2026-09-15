"use client";

import { useEffect, useState } from "react";
import ImageCard from "./ImageCard";
import { toExportRows, useReviewerName } from "@/lib/reviewStore";
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
  const { name: reviewerName } = useReviewerName();

  async function handleDownloadAll() {
    const rows = toExportRows(reviewerName || "Unnamed reviewer");
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, idx) => (
          <ImageCard key={img.id} image={img} displayNumber={idx + 1} />
        ))}
      </div>
    </div>
  );
}
