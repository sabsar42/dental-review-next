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
  const { reviews, loadError: reviewsError, saveReview, unmarkReview, resetAll } = useReviews();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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

  async function handleReset() {
    setResetting(true);
    setResetError(null);
    try {
      await resetAll();
      setReviewerName("");
      setConfirmingReset(false);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset — please try again");
    } finally {
      setResetting(false);
    }
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

  const header = (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-teal-700 dark:text-teal-400">🦷 Dental X-Ray Review</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{today}</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="shrink-0">Reviewer name:</span>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none sm:w-auto sm:py-1.5 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadAll}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800 sm:flex-none sm:py-2"
              >
                ⬇ Download responses (Excel)
              </button>

              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                title="Reset everything — name and all reviews"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:border-red-400 hover:text-red-600 sm:py-2 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-700 dark:hover:text-red-400"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  const resetDialog = confirmingReset && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Are you sure you want to reset it?</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This clears the reviewer name and every saved review for everyone using this site. This cannot be undone.
        </p>
        {resetError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{resetError}</p>}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={() => {
              setConfirmingReset(false);
              setResetError(null);
            }}
            disabled={resetting}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            No
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetting ? "Resetting…" : "Yes, reset"}
          </button>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <>
        {header}
        {resetDialog}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            Could not load the dataset: {error}
          </div>
        </div>
      </>
    );
  }

  if (!images) {
    return (
      <>
        {header}
        {resetDialog}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {resetDialog}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {images.length} image{images.length === 1 ? "" : "s"}
        </p>

        {reviewsError && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load saved reviews from the server ({reviewsError}). Showing locally cached progress only.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {images.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              displayNumber={idx + 1}
              savedReview={reviews[img.id] ?? null}
              reviewerName={reviewerName}
              onSave={saveReview}
              onUnmark={unmarkReview}
              priorityLoad={idx < 3}
            />
          ))}
        </div>
      </div>
    </>
  );
}
