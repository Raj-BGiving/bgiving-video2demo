import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";

const execAsync = promisify(exec);

export type VideoUrlInfo = {
  url: string;
  fileName: string;
  format: string;
  downloadPath: string;
};

export async function downloadLoomVideo(
  url: string,
  outputDir: string
): Promise<VideoUrlInfo> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // First get the video info
    const id = url.split("/").pop()?.split("?")[0];
    if (!id) {
      throw new Error("Invalid Loom URL");
    }

    const response = await fetch(
      `https://www.loom.com/api/campaigns/sessions/${id}/transcoded-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get video URL from Loom");
    }

    const data = (await response.json()) as { url: string };
    const videoUrl = data.url;

    const fileName = `loom-${id}`;
    const outputPath = path.join(outputDir, `${fileName}.mp4`);

    // Download the video using curl
    await execAsync(`curl -L "${videoUrl}" -o "${outputPath}"`);

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
