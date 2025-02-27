import ffmpeg from "fluent-ffmpeg";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

interface ExtractedFrame {
  timestamp: number;
  path: string;
}

interface ExtractedVideo {
  timestamp: number;
  path: string;
}

export class FrameExtractor {
  async extractFrames(
    videoPath: string,
    timestamps: number[],
    sessionId: string
  ): Promise<ExtractedFrame[]> {
    // Create session directory for frames
    const framesDir = path.join("public", "tmp", sessionId, "frames");
    await mkdir(framesDir, { recursive: true });

    const extractedFrames: ExtractedFrame[] = [];

    // Sort timestamps to process in order
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    for (const timestamp of sortedTimestamps) {
      try {
        const outputPath = path.join(framesDir, `frame_${timestamp}.jpg`);
        await this.extractSingleFrame(videoPath, timestamp, outputPath);

        extractedFrames.push({
          timestamp,
          path: outputPath,
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
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp + 4],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: "1280x720",
        })
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
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

export class RelevantFramesAsVideoExtractor {
  async extractVideos(
    videoPath: string,
    timestamps: number[],
    sessionId: string
  ): Promise<ExtractedVideo[]> {
    // Create session directory for frames
    const videoDir = path.join("public", "tmp", sessionId, "videos");
    await mkdir(videoDir, { recursive: true });

    const extractedVideos: ExtractedVideo[] = [];

    // Sort timestamps to process in order
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    for (let i = 0; i < sortedTimestamps.length; i++) {
      const currentTimestamp = sortedTimestamps[i];
      const outputPath = path.join(videoDir, `video_${currentTimestamp}.mp4`);

      if (existsSync(outputPath)) {
        continue;
      }

      // Extract a segment starting 1 second before the current timestamp (if possible)
      // and ending 5 seconds after (if possible)
      const startTimestamp = Math.max(0, currentTimestamp);
      const endTimestamp = currentTimestamp + 6;

      try {
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .seekInput(startTimestamp)
            .duration(endTimestamp - startTimestamp)
            .output(outputPath)
            .on("end", () => {
              console.log(
                `Video ${startTimestamp} to ${endTimestamp} extracted`
              );
              resolve(null);
            })
            .on("error", (err) => {
              reject(err);
            })
            .run();
        });

        extractedVideos.push({
          timestamp: currentTimestamp,
          path: outputPath,
        });
      } catch (error) {
        console.error(
          `Error extracting video ${startTimestamp} to ${endTimestamp}:`,
          error
        );
        // Continue with other timestamps even if one fails
      }
    }

    return extractedVideos;
  }
}

// Usage example:
/*
const extractor = new FrameExtractor();
const frames = await extractor.extractFrames(
  'path/to/video.mp4',
  [0, 30, 60, 90], // Array of timestamps in seconds
  'session123'     // Session ID for grouping frames
);
*/
