import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { VideoUrlInfo } from "../utils/types";

const execAsync = promisify(exec);

export async function downloadCloudfrontVideo(
  url: string,
  outputDir: string
): Promise<VideoUrlInfo> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const urlObj = new URL(url);
    const id = urlObj.pathname.split("/").pop() || Date.now().toString();

    const fileName = `cloudfront-${id}`;
    const outputPath = path.join(outputDir, `${fileName}.mp4`);

    await execAsync(`curl -L "${url}" -o "${outputPath}"`);

    return {
      url,
      fileName,
      format: "mp4",
      downloadPath: outputPath,
    };
  } catch (error) {
    console.error("Error downloading Cloudfront video:", error);
    throw error;
  }
}
