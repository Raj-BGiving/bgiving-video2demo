import { TranscriptProcessor } from "./transcript-processor";
import {
  FrameExtractor,
  RelevantFramesAsVideoExtractor,
} from "./frame-extractor";
import { rm } from "fs/promises";
import path from "path";
import {
  ProcessedSplittedStep,
  ProcessedVideo,
  TUserChoiceBody,
} from "../utils/types";
import fs from "fs";
import { jobManager } from "../services/job-manager";

export class VideoUtils {
  private transcriptProcessor: TranscriptProcessor;
  private frameExtractor: FrameExtractor;
  private relevantFramesAsVideoExtractor: RelevantFramesAsVideoExtractor;

  constructor() {
    this.transcriptProcessor = new TranscriptProcessor();
    this.frameExtractor = new FrameExtractor();
    this.relevantFramesAsVideoExtractor = new RelevantFramesAsVideoExtractor();
  }

  async processVideo(
    videoPath: string,
    sessionId: string,
    userInputs: TUserChoiceBody
  ): Promise<ProcessedVideo> {
    try {
      console.log("Generating transcript...");
      const { transcript, summary, videoPathWithoutAudio, maxVideoDuration } =
        await this.transcriptProcessor.generateTranscript(
          videoPath,
          sessionId,
          userInputs
        );

      console.log("Transcript generated");

      if (!videoPathWithoutAudio) {
        throw new Error("Failed to generate video without audio");
      }

      const timestamps = summary.steps.map((step) => step.timestamp);

      const filteredTimestamps = timestamps.filter(
        (timestamp: number) => timestamp < maxVideoDuration
      );

      console.log("Extracting frames...");

      jobManager.updateJobProgress(sessionId, {
        stage: "processing_video",
        progress: 60,
        message: "Extracting relevant frames",
      });

      const frames = await this.frameExtractor.extractFrames(
        videoPathWithoutAudio,
        filteredTimestamps,
        sessionId
      );

      console.log("Frames extracted.");

      jobManager.updateJobProgress(sessionId, {
        stage: "processing_video",
        progress: 80,
        message: "Extracting relevant sections",
      });

      console.log("Extracting relevant videos...");

      const videos = await this.relevantFramesAsVideoExtractor.extractVideos(
        videoPathWithoutAudio,
        filteredTimestamps,
        sessionId
      );

      console.log("Video processing complete.");

      const stepsWithFrames = summary.steps.map((step, index: number) => ({
        ...step,
        serialNumber: index + 1,
        framePath: frames[index]?.path || "",
        videoPath: videos[index]?.path || "",
        videoDuration: videos[index]?.videoDuration || 0,
      }));

      const splittedSteps: ProcessedSplittedStep[] = [];

      summary.steps.map((step, index: number) => {
        splittedSteps.push(
          {
            ...step,
            serialNumber: index + 1,
            mediaPath: videos[index]?.path || "",
            mediaType: "video",
            videoDuration: videos[index]?.videoDuration || 0,
          },
          {
            ...step,
            serialNumber: index + 1,
            mediaPath: frames[index]?.path || "",
            mediaType: "image",
            videoDuration: videos[index]?.videoDuration || 0,
          }
        );
      });

      return {
        projectId: sessionId,
        title: summary.title,
        overview: summary.overview,
        steps: stepsWithFrames,
        transcript,
        videoDuration: maxVideoDuration,
        splittedSteps,
      };
    } catch (error) {
      console.error("Error processing video:", error);
      throw error;
    }
  }

  async cleanup(sessionId: string): Promise<void> {
    const tempDir = path.join(process.cwd(), "tmp", sessionId);
    try {
      if (fs.existsSync(tempDir)) {
        await rm(tempDir, { recursive: true });
      }
    } catch (error) {
      console.error("Error cleaning up:", error);
      throw error;
    }
  }

  async validateVideoUrl(
    url: string
  ): Promise<"youtube" | "loom" | "cloudfront" | "s3" | "none"> {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (youtubeRegex.test(url)) return "youtube";
    const loomRegex = /^(https?:\/\/)?(www\.)?loom\.com\/.+/;
    if (loomRegex.test(url)) return "loom";
    const cloudfrontRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?cloudfront\.net\/.+/;
    if (cloudfrontRegex.test(url)) return "cloudfront";
    const s3Regex = /^(https?:\/\/)?([a-z0-9-]+\.)?s3\.amazonaws\.com\/.+/;
    if (s3Regex.test(url)) return "s3";
    return "none";
  }
}
