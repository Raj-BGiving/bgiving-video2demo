import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { mkdir } from "fs/promises";
import { exec } from "child_process";

export class MediaProcessor {
  private static readonly TEMP_DIR = path.join(process.cwd(), "tmp");

  async separateAudio(videoPath: string): Promise<string> {
    const audioPathWithoutExt = videoPath.replace(/\.[^/.]+$/, "");
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions("-c:v", "copy")
        .outputOptions("-c:a", "libmp3lame")
        .outputOptions("-b:a", "128k")
        .on("end", () => resolve(audioPathWithoutExt + "-audio.mp3"))
        .on("error", (err) => reject(err))
        .save(audioPathWithoutExt + "-audio.mp3");
    });
  }

  async separateVideoWithoutAudio(videoPath: string): Promise<string> {
    const videoPathWithoutExt = videoPath.replace(/\.[^/.]+$/, "");
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions("-c:v", "copy")
        .outputOptions("-an")
        .on("end", () => resolve(videoPathWithoutExt + "-video.mp4"))
        .on("error", (err) => reject(err))
        .save(videoPathWithoutExt + "-video.mp4");
    });
  }

  async getDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath).ffprobe((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data?.format?.duration ?? 0);
        }
      });
    });
  }
}
