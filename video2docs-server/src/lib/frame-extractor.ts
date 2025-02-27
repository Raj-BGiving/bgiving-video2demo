import ffmpeg from "fluent-ffmpeg";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { S3Utils } from "../utils/s3-utils";
import { generateUniqueId } from "./utils";

interface ExtractedFrame {
  timestamp: number;
  path: string;
}

interface ExtractedVideo {
  timestamp: number;
  path: string;
  videoDuration: number;
}

export class FrameExtractor {
  private s3Utils = new S3Utils();

  constructor() {
    this.s3Utils = new S3Utils();
  }
  async extractFrames(
    videoPath: string,
    timestamps: number[],
    sessionId: string
  ): Promise<ExtractedFrame[]> {
    const extractedFrames: ExtractedFrame[] = [];
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    for (const timestamp of sortedTimestamps) {
      try {
        const s3Key = `${sessionId}/frames/frame_${timestamp}.jpg`;
        const frameUrl = await this.extractSingleFrame(
          videoPath,
          timestamp,
          s3Key
        );
        extractedFrames.push({
          timestamp,
          path: frameUrl,
        });
      } catch (error) {
        console.error(`Error extracting frame at ${timestamp}s:`, error);
        // Continue with other frames even if one fails
      }
    }

    return extractedFrames;
  }

  private async extractSingleFrame(
    videoPath: string,
    timestamp: number,
    s3Key: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = `/tmp/screenshot_${timestamp}.jpg`;

      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp + 4],
          size: "1280x720",
          filename: `screenshot_${timestamp}.jpg`,
          folder: "/tmp",
        })
        .on("end", async () => {
          try {
            const fileBuffer = await fs.promises.readFile(outputPath);
            const url = await this.s3Utils.uploadBuffer(
              fileBuffer,
              s3Key,
              "image/jpeg"
            );

            // Clean up the temporary file
            await fs.promises.unlink(outputPath);

            resolve(url);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (err) => {
          console.error(`Error extracting frame at ${timestamp}:`, err);
          reject(err);
        });
    });
  }

  private async optimizeFrame(framePath: string): Promise<void> {
    try {
      await sharp(framePath)
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer()
        .then((buffer) => sharp(buffer).toFile(framePath));
    } catch (error) {
      console.error("Error optimizing frame:", error);
      // Continue even if optimization fails
    }
  }

  // Helper function to format timestamp for naming
  static formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}_${secs.toString().padStart(2, "0")}`;
  }
}

/////////////////////////////
/////////////////////////////

export class RelevantFramesAsVideoExtractor {
  private s3Utils: S3Utils;

  constructor() {
    this.s3Utils = new S3Utils();
  }

  async extractVideos(
    videoPath: string,
    timestamps: number[],
    sessionId: string
  ): Promise<ExtractedVideo[]> {
    const extractedVideos: ExtractedVideo[] = [];
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    for (let i = 0; i < sortedTimestamps.length; i++) {
      const currentTimestamp = sortedTimestamps[i];
      const s3Key = `${sessionId}/videos/video_${currentTimestamp}.mp4`;

      const startTimestamp = Math.max(0, currentTimestamp);
      const endTimestamp = currentTimestamp + 6;

      try {
        const url = await this.extractVideoSegment(
          videoPath,
          startTimestamp,
          endTimestamp,
          s3Key
        );

        extractedVideos.push({
          timestamp: currentTimestamp,
          path: url,
          videoDuration: endTimestamp - startTimestamp,
        });
      } catch (error) {
        console.error(
          `Error extracting video ${startTimestamp} to ${endTimestamp}:`,
          error
        );
      }
    }

    return extractedVideos;
  }

  private async extractVideoSegment(
    videoPath: string,
    startTimestamp: number,
    endTimestamp: number,
    s3Key: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = generateUniqueId();

      const tempOutputPath = path.join(
        process.cwd(),
        "tmpsegments",
        `${id}.mp4`
      );

      if (!fs.existsSync(path.dirname(tempOutputPath))) {
        fs.mkdirSync(path.dirname(tempOutputPath), { recursive: true });
      }

      ffmpeg(videoPath)
        .seekInput(startTimestamp)
        .duration(endTimestamp - startTimestamp)
        .output(tempOutputPath)
        .on("end", async () => {
          try {
            const fileBuffer = await fs.promises.readFile(tempOutputPath);
            const url = await this.s3Utils.uploadBuffer(
              fileBuffer,
              s3Key,
              "video/mp4"
            );

            // Clean up temporary file
            fs.unlink(tempOutputPath, (err) => {
              if (err) console.error("Error deleting temporary file:", err);
            });

            resolve(url);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (err) => {
          reject(err);
          // Clean up temporary file in case of error
          fs.unlink(tempOutputPath, () => {});
        })
        .run();
    });
  }
}
