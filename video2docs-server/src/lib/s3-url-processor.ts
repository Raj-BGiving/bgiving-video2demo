import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { VideoUrlInfo } from "../utils/types";

const execAsync = promisify(exec);

export async function downloadS3File(
  url: string,
  outputDir: string
): Promise<VideoUrlInfo> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const id = pathParts[pathParts.length - 1];

    const fileName = `s3-${id}`;
    const outputPath = path.join(outputDir, `${fileName}.mp4`);

    await execAsync(`curl -L "${url}" -o "${outputPath}"`);

    return {
      url,
      fileName,
      format: "mp4",
      downloadPath: outputPath,
    };
  } catch (error) {
    console.error("Error downloading S3 file:", error);
    throw error;
  }
}
