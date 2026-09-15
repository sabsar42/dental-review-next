"use client";

import { useEffect, useState } from "react";
import type { DatasetImage } from "./ImageGallery";
import type { ToothAnnotation } from "./api/annotations/[filename]/route";
import {
  ISSUE_REASONS,
  TOOTH_TYPE_CHOICES,
  type ImageReview,
  type IssueReason,
  type ToothIssue,
} from "@/lib/reviewTypes";
import { getSavedImageReview, saveImageReview } from "@/lib/reviewStore";

interface AnnotationsResponse {
  imageId: number;
  fileName: string;
  width: number;
  height: number;
  teeth: ToothAnnotation[];
}

export default function ImageCard({ image, displayNumber }: { image: DatasetImage; displayNumber: number }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewed, setReviewed] = useState(() => getSavedImageReview(image.id) !== null);

  const encodedName = encodeURIComponent(image.fileName);
  const thumbSrc = `/api/image/${encodedName}?kind=overlay`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all dark:bg-slate-900 ${
        reviewed ? "border-green-300 dark:border-green-800" : "border-slate-200 dark:border-slate-800"
      } ${expanded ? "col-span-full" : ""}`}
    >
      {!expanded && (
        <>
          <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbSrc} alt={`X-ray ${displayNumber}`} className="h-full w-full object-cover" />
            {reviewed && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-green-600 bg-green-600/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
                ✓ Reviewed
              </span>
            )}
          </div>

          <div className="space-y-3 p-4">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">X-ray {displayNumber}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {image.width}×{image.height} · {image.toothCount} teeth marked
              </p>
            </div>

            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={`block w-full rounded-lg px-3 py-2 text-center text-sm font-semibold text-white transition-colors ${
                reviewed ? "bg-green-600 hover:bg-green-700" : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {reviewed ? "Review complete — edit" : "Start review"}
            </button>
          </div>
        </>
      )}

      {expanded && (
        <ExpandedReview
          image={image}
          displayNumber={displayNumber}
          onClose={() => setExpanded(false)}
          onReviewedChange={setReviewed}
        />
      )}
    </div>
  );
}

function emptyIssue(t: ToothAnnotation): ToothIssue {
  return {
    toothNumber: t.toothNumber,
    annotationId: t.annotationId,
    toothTypeAssigned: t.toothType,
    reasons: [],
    suggestedType: "Not sure",
    comment: "",
  };
}

function ExpandedReview({
  image,
  displayNumber,
  onClose,
  onReviewedChange,
}: {
  image: DatasetImage;
  displayNumber: number;
  onClose: () => void;
  onReviewedChange: (reviewed: boolean) => void;
}) {
  const [annotations, setAnnotations] = useState<AnnotationsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);

  const [q1, setQ1] = useState<"Yes" | "No">("No");
  const [q1Detail, setQ1Detail] = useState("");
  const [q2, setQ2] = useState<"Yes" | "No">("No");
  const [q2Detail, setQ2Detail] = useState("");
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [issues, setIssues] = useState<Record<number, ToothIssue>>({});
  // the flagged tooth whose small edit dropdown is currently open (only one at a time)
  const [openToothNumber, setOpenToothNumber] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/annotations/${encodeURIComponent(image.fileName)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Failed to load teeth for this image");
          return;
        }
        setAnnotations(data);

        const saved = getSavedImageReview(data.imageId);
        if (saved) {
          setQ1(saved.missingTeeth);
          setQ1Detail(saved.missingDescription);
          setQ2(saved.phantomMarks);
          setQ2Detail(saved.phantomDescription);
          setIssues(saved.issues);
          setFlagged(new Set(Object.values(saved.issues).map((i) => i.toothNumber)));
          setOpenToothNumber(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load teeth for this image");
      });
    return () => {
      cancelled = true;
    };
    // fileName is fixed for the lifetime of this component instance (one card per image)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const encodedName = encodeURIComponent(image.fileName);
  const src = `/api/image/${encodedName}?kind=${showOverlay ? "overlay" : "raw"}`;

  function removeFlag(t: ToothAnnotation) {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.delete(t.toothNumber);
      return next;
    });
    setIssues((prevIssues) => {
      const copy = { ...prevIssues };
      delete copy[t.annotationId];
      return copy;
    });
    setOpenToothNumber((cur) => (cur === t.toothNumber ? null : cur));
  }

  function addFlag(t: ToothAnnotation) {
    setFlagged((prev) => new Set(prev).add(t.toothNumber));
    setIssues((prevIssues) => ({ ...prevIssues, [t.annotationId]: emptyIssue(t) }));
    setOpenToothNumber(t.toothNumber);
  }

  // one click on a tooth row: flag it (and open its editor) if untouched,
  // otherwise just toggle its editor open/closed — always exactly one open at a time
  function handleRowClick(t: ToothAnnotation, isFlagged: boolean) {
    if (!isFlagged) {
      addFlag(t);
      return;
    }
    setOpenToothNumber((cur) => (cur === t.toothNumber ? null : t.toothNumber));
  }

  function updateIssue(annotationId: number, patch: Partial<ToothIssue>) {
    setIssues((prev) => ({
      ...prev,
      [annotationId]: { ...prev[annotationId], ...patch },
    }));
  }

  function toggleReason(annotationId: number, reason: IssueReason) {
    setIssues((prev) => {
      const current = prev[annotationId];
      const has = current.reasons.includes(reason);
      const reasons = has ? current.reasons.filter((r) => r !== reason) : [...current.reasons, reason];
      return { ...prev, [annotationId]: { ...current, reasons } };
    });
  }

  function handleSave() {
    if (!annotations) return;

    const review: ImageReview = {
      imageId: annotations.imageId,
      imageFileName: annotations.fileName,
      missingTeeth: q1,
      missingDescription: q1Detail,
      phantomMarks: q2,
      phantomDescription: q2Detail,
      teeth: annotations.teeth.map((t) => ({
        toothNumber: t.toothNumber,
        annotationId: t.annotationId,
        toothType: t.toothType,
      })),
      issues,
      reviewedAt: new Date().toISOString(),
    };
    saveImageReview(annotations.imageId, review);
    onReviewedChange(true);
    setBanner("Saved.");
    setTimeout(() => onClose(), 400);
  }

  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600 dark:text-red-400">Could not load this image: {loadError}</p>
        <button type="button" onClick={onClose} className="mt-3 text-sm text-teal-700 hover:underline dark:text-teal-400">
          Close
        </button>
      </div>
    );
  }

  if (!annotations) {
    return <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  const teeth = annotations.teeth;

  return (
    <div>
      {/* Header row: title + view controls, spans full width above both panes */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-teal-700 dark:text-teal-400">X-ray {displayNumber}</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{teeth.length} teeth marked</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showOverlay}
              onChange={(e) => setShowOverlay(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Show overlay
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Show numbers
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* LEFT: fixed image pane */}
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="lg:sticky lg:top-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`X-ray ${displayNumber}`} className="h-full w-full object-contain" />
              {showNumbers &&
                teeth.map((t) =>
                  t.centroid ? (
                    <div
                      key={t.annotationId}
                      className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow ${
                        openToothNumber === t.toothNumber
                          ? "border-teal-600 bg-teal-500 text-white"
                          : flagged.has(t.toothNumber)
                            ? "border-red-600 bg-red-400 text-red-950"
                            : "border-black/60 bg-white text-slate-800"
                      }`}
                      style={{
                        left: `${(t.centroid.x / annotations.width) * 100}%`,
                        top: `${(t.centroid.y / annotations.height) * 100}%`,
                      }}
                      title={t.toothType}
                    >
                      {t.toothNumber}
                    </div>
                  ) : null
                )}
            </div>
          </div>
        </div>

        {/* RIGHT: scrollable tooth list + fixed "about this X-ray" card below it */}
        <div className="flex max-h-[85vh] flex-col">
          {banner && (
            <div className="mx-5 mt-5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
              {banner}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            <section>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tooth-by-tooth check</h3>
              <p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                Every tooth is assumed correct by default. Tap a tooth only if something looks wrong.
              </p>

              <div className="space-y-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {teeth.map((t, i) => {
                const isFlagged = flagged.has(t.toothNumber);
                const isOpen = openToothNumber === t.toothNumber;
                const issue = issues[t.annotationId];
                return (
                  <div key={t.annotationId}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(t, isFlagged)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        i !== 0 ? "border-t border-slate-100 dark:border-slate-800" : ""
                      } ${
                        isOpen
                          ? "bg-teal-50 dark:bg-teal-950/30"
                          : isFlagged
                            ? "bg-red-50 dark:bg-red-950/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-black">
                          {t.toothNumber}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">{t.toothType}</span>
                      </span>

                      {isFlagged ? (
                        <span className="flex items-center gap-2">
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                            Flagged
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFlag(t);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                e.preventDefault();
                                removeFlag(t);
                              }
                            }}
                            title="Remove this flag — mark as correct"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-red-400 text-sm font-bold text-red-500 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white dark:border-red-700 dark:text-red-400 dark:hover:bg-red-700"
                          >
                            ✕
                          </span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                          Correct
                        </span>
                      )}
                    </button>

                    {isOpen && issue && (
                      <div className="border-t border-red-200 bg-red-50/60 px-3 py-3 dark:border-red-900 dark:bg-red-950/10">
                        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          What&apos;s wrong with tooth {t.toothNumber}?
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {ISSUE_REASONS.map((r) => (
                            <label
                              key={r}
                              className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={issue.reasons.includes(r)}
                                onChange={() => toggleReason(t.annotationId, r)}
                                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                              />
                              {r}
                            </label>
                          ))}
                        </div>

                        {issue.reasons.includes("Wrong tooth type") && (
                          <div className="mt-2">
                            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                              What should it be?
                            </label>
                            <select
                              value={issue.suggestedType}
                              onChange={(e) => updateIssue(t.annotationId, { suggestedType: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                            >
                              {TOOTH_TYPE_CHOICES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <input
                          type="text"
                          value={issue.comment}
                          onChange={(e) => updateIssue(t.annotationId, { comment: e.target.value })}
                          placeholder="Comment (optional)"
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                        />

                        <button
                          type="button"
                          onClick={() => setOpenToothNumber(null)}
                          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </section>
          </div>

          <div className="border-t border-slate-200 p-5 dark:border-slate-800">
            <section className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">About this X-ray</h3>

              <div className="space-y-2">
                <YesNoQuestion label="Any teeth clearly visible but not marked at all?" value={q1} onChange={setQ1} />
                {q1 === "Yes" && (
                  <textarea
                    value={q1Detail}
                    onChange={(e) => setQ1Detail(e.target.value)}
                    placeholder="Describe by location, e.g. upper left back molar"
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                )}
              </div>

              <div className="space-y-2">
                <YesNoQuestion
                  label="Any marks on areas that don't look like a tooth?"
                  value={q2}
                  onChange={setQ2}
                  accent="indigo"
                />
                {q2 === "Yes" && (
                  <textarea
                    value={q2Detail}
                    onChange={(e) => setQ2Detail(e.target.value)}
                    placeholder="Describe which marks look incorrect"
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                )}
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Save and mark complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function YesNoQuestion({
  label,
  value,
  onChange,
  accent = "teal",
}: {
  label: string;
  value: "Yes" | "No";
  onChange: (v: "Yes" | "No") => void;
  accent?: "teal" | "indigo";
}) {
  const borderClass =
    accent === "teal"
      ? "border-teal-300 dark:border-teal-700"
      : "border-indigo-300 dark:border-indigo-700";

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border-2 bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60 ${borderClass}`}
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex shrink-0 gap-3">
        {(["No", "Yes"] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <input type="radio" checked={value === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
