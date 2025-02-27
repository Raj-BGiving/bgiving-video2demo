import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type VideoUrlInfo = {
  url: string;
  fileName: string;
  format: string;
  downloadPath: string;
};

export async function validateVideoUrl(
  url: string
): Promise<"youtube" | "loom" | "none"> {
  // Basic URL validation for YouTube
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (youtubeRegex.test(url)) return "youtube";
  const loomRegex = /^(https?:\/\/)?(www\.)?loom\.com\/.+/;
  if (loomRegex.test(url)) return "loom";
  return "none";
}

export async function downloadYoutubeVideo(
  url: string,
  outputDir: string
): Promise<VideoUrlInfo> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // First get the video info
    const { stdout: videoInfo } = await execAsync(
      `yt-dlp --print "%(title)s" --get-format ${url}`
    );
    const [title, format] = videoInfo.trim().split("\n");

    // Create a safe filename from the title
    const safeTitle = title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 50);
    const fileName = `${safeTitle}-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, fileName);

    // Download the video
    await execAsync(
      `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${outputPath}" ${url}`
    );

    return {
      url,
      fileName,
      format: "mp4",
      downloadPath: outputPath,
    };
  } catch (error) {
    console.error("Download error:", error);
    throw new Error("Failed to download video");
  }
}
