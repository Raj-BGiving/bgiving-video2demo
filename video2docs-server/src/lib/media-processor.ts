import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { ProcessedStep } from "../utils/types";
import { spawn } from "child_process";

export class MediaProcessor {
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

  async validateAudioFile(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const ffprobe = spawn("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=codec_name",
        "-of",
        "default=noprint_wrappers=1",
        filePath,
      ]);

      let output = "";

      ffprobe.stdout.on("data", (data) => {
        output += data.toString();
      });

      ffprobe.on("close", (code) => {
        // If ffprobe exits with code 0 and we found audio streams
        resolve(code === 0 && output.trim().length > 0);
      });
    });
  }

  async compressAudio(audioPath: string, outputPath: string): Promise<string> {
    const hasAudio = await this.validateAudioFile(audioPath);

    if (!hasAudio) {
      console.error("No audio stream found");
      throw new Error("No audio stream found");
    }

    return new Promise((resolve, reject) => {
      const command = ffmpeg(audioPath);
      command
        .outputOptions([
          "-codec:a",
          "libmp3lame", // Use MP3 LAME codec
          "-maxrate",
          "112k", // Set bitrate to 112kbps
          "-minrate",
          "64k",
          "-map_metadata",
          "0", // Preserve metadata from input
          "-id3v2_version",
          "3", // Use ID3v2.3 tags
          "-fs",
          "20M", // Set maximum file size
        ])
        .on("start", (cmd) => console.log("Started ffmpeg with command:", cmd))
        .on("end", () => resolve(outputPath))
        .on("error", (err) => reject(err))
        .output(outputPath)
        .run();
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

  async mergeVideos(videoPaths: string[], outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileListPath = outputPath + ".txt";
      const fileList = videoPaths.map((path) => `file '${path}'`).join("\n");
      fs.writeFileSync(fileListPath, fileList);

      const command = ffmpeg();

      command
        .input(fileListPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions("-c", "copy")
        .on("start", (cmd) => console.log("Started ffmpeg with command:", cmd))
        .on("end", () => {
          fs.unlinkSync(fileListPath);
          resolve(outputPath);
        })
        .on("error", (err) => {
          if (fs.existsSync(fileListPath)) {
            fs.unlinkSync(fileListPath);
          }
          reject(err);
        })
        .output(outputPath)
        .run();
    });
  }
}
