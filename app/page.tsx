import ImageGallery from "./ImageGallery";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ImageGallery />
    </main>
  );
}
