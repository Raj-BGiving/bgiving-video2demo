import ffmpeg from "fluent-ffmpeg";
import { mkdir, rm } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { siteConfig } from "../config";
import { existsSync, mkdirSync } from "fs";

export interface VideoProcessingOptions {
  frameInterval?: number;
  outputQuality?: number;
  maxFrames?: number;
  similarityThreshold?: number;
}

export class VideoProcessor {
  private static readonly TEMP_DIR = path.join(process.cwd(), "tmp");
  private static readonly MAX_PROCESSING_TIME = 300000; // 5 minutes
  private static readonly HASH_SIZE = 8; // Size of the perceptual hash

  constructor(private readonly videoPath: string) {}

  private async calculateImageHash(imagePath: string): Promise<Buffer> {
    const hashSize = VideoProcessor.HASH_SIZE;
    return await sharp(imagePath)
      .greyscale()
      .resize(hashSize, hashSize, { fit: "fill" })
      .raw()
      .toBuffer();
  }

  private calculateHashDifference(hash1: Buffer, hash2: Buffer): number {
    let diff = 0;
    for (let i = 0; i < hash1.length; i++) {
      diff += Math.abs(hash1[i] - hash2[i]);
    }
    return diff / (hash1.length * 255); // Normalize to 0-1 range
  }

  async extractFrames(options: VideoProcessingOptions = {}): Promise<{
    frames: string[];
    sessionId: string;
    totalFrames: number;
  }> {
    const {
      frameInterval = 1,
      outputQuality = 80,
      maxFrames = siteConfig.processing.maxFramesPerVideo,
      similarityThreshold = 0.1,
    } = options;

    const sessionId = Math.random().toString(36).substring(7);
    const outputDir = path.join(VideoProcessor.TEMP_DIR, sessionId);

    try {
      await mkdir(outputDir, { recursive: true });

      return new Promise((resolve, reject) => {
        const outputFrames: string[] = [];
        let frameCount = 0;
        const frameHashes: Buffer[] = [];

        const command = ffmpeg(this.videoPath)
          .fps(1 / frameInterval)
          .frames(maxFrames)
          .outputOptions(["-qscale:v", "2"])
          .output(path.join(outputDir, "frame_%d.jpg"));

        const timeout = setTimeout(() => {
          command.kill("SIGKILL");
          reject(new Error("Video processing timeout"));
        }, VideoProcessor.MAX_PROCESSING_TIME);

        command
          .on("end", async () => {
            clearTimeout(timeout);
            try {
              for (let i = 1; i <= maxFrames; i++) {
                const framePath = path.join(outputDir, `frame_${i}.jpg`);
                try {
                  const frameHash = await this.calculateImageHash(framePath);

                  let isDistinct = true;
                  for (const existingHash of frameHashes) {
                    const difference = this.calculateHashDifference(
                      frameHash,
                      existingHash
                    );
                    if (difference < similarityThreshold) {
                      isDistinct = false;
                      break;
                    }
                  }

                  if (isDistinct) {
                    outputFrames.push(framePath);
                    frameHashes.push(frameHash);
                    frameCount++;
                  }
                } catch (err) {
                  break;
                }
              }
              resolve({
                frames: outputFrames,
                sessionId,
                totalFrames: frameCount,
              });
            } catch (err) {
              reject(new Error("Failed to optimize frames"));
            }
          })
          .on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          })
          .on("progress", (progress) => {
            console.log("Processing: " + progress.percent + "% done");
          });

        command.run();
      });
    } catch (error) {
      await this.cleanup(sessionId);
      throw error;
    }
  }

  async cleanup(sessionId: string): Promise<void> {
    const outputDir = path.join(VideoProcessor.TEMP_DIR, sessionId);
    try {
      await rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Error cleaning up:", error);
    }
  }
}
