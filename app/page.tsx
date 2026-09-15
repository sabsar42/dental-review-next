import ImageGallery from "./ImageGallery";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-bold text-teal-700 dark:text-teal-400">
            🦷 Dental X-Ray Overlay Viewer
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Toggle tooth-boundary overlays and verify source images are available.
          </p>
        </div>
      </header>
      <ImageGallery />
    </main>
  );
}
