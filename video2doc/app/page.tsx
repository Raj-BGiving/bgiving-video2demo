import { siteConfig } from "@/lib/config";
import { VideoUploader } from "./_components/video-uploader";
import RecentPublicJobs from "./_components/RecentPublicJobs";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{siteConfig.name}</h1>
          <p className="mt-2 text-muted-foreground">{siteConfig.description}</p>
        </div>

        <div className="mt-8 flex flex-col gap-10">
          <VideoUploader />
          <RecentPublicJobs />
        </div>
      </div>
    </main>
  );
}
