// src/lib/server/video-utils.ts
import { TranscriptProcessor } from "./transcript-processor";
import {
  FrameExtractor,
  RelevantFramesAsVideoExtractor,
} from "./frame-extractor";
import { unlink } from "fs/promises";
import path from "path";

export interface ProcessedStep {
  timestamp: number;
  description: string;
  framePath: string;
}

export interface ProcessedVideo {
  title: string;
  overview: string;
  steps: ProcessedStep[];
  transcript: Array<{
    timestamp: number;
    text: string;
  }>;
}

export class VideoUtils {
  private transcriptProcessor: TranscriptProcessor;
  private frameExtractor: FrameExtractor;
  private relevantFramesAsVideoExtractor: RelevantFramesAsVideoExtractor;

  constructor() {
    this.transcriptProcessor = new TranscriptProcessor();
    this.frameExtractor = new FrameExtractor();
    this.relevantFramesAsVideoExtractor = new RelevantFramesAsVideoExtractor();
  }

  async processVideo(videoPath: string): Promise<ProcessedVideo> {
    try {
      // First get transcript and summary
      console.log("Generating transcript...");
      const { transcript, summary, videoPathWithoutAudio, maxVideoDuration } =
        await this.transcriptProcessor.generateTranscript(videoPath);

      console.log("videoPathWithoutAudio", videoPathWithoutAudio);

      if (!videoPathWithoutAudio) {
        throw new Error("Failed to generate video without audio");
      }

      // Extract timestamps from steps
      const timestamps = summary.steps.map((step: any) => step.time);

      // remove timestamps which are greated than 6 mins

      const filteredTimestamps = timestamps.filter(
        (timestamp: number) => timestamp < maxVideoDuration
      );

      // Extract frames for these timestamps
      console.log("Extracting frames...");
      const sessionId = path.basename(
        videoPathWithoutAudio,
        path.extname(videoPathWithoutAudio)
      );
      const frames = await this.frameExtractor.extractFrames(
        videoPathWithoutAudio,
        filteredTimestamps,
        sessionId
      );

      const videos = await this.relevantFramesAsVideoExtractor.extractVideos(
        videoPathWithoutAudio,
        filteredTimestamps,
        sessionId
      );

      // Combine steps with frame paths
      const stepsWithFrames = summary.steps.map((step: any, index: any) => ({
        timestamp: step.time,
        description: step.description,
        framePath: frames[index]?.path || "",
        videoPath: videos[index]?.path || "",
      }));

      return {
        title: summary.title,
        overview: summary.overview,
        steps: stepsWithFrames,
        transcript,
      };
    } catch (error) {
      console.error("Error processing video:", error);
      throw error;
    }
  }

  // Helper function to clean up temporary files
  async cleanup(sessionId: string): Promise<void> {
    const tempDir = path.join(process.cwd(), "tmp", sessionId);
    try {
      await unlink(tempDir);
    } catch (error) {
      console.error("Error cleaning up:", error);
    }
  }
}

// Usage example:
/*
const videoUtils = new VideoUtils();
const result = await videoUtils.processVideo('path/to/video.mp4');

// result will contain:
// - Transcribed text with timestamps
// - Summary with title and overview
// - Step-by-step guide with descriptions and frame paths
// - Full transcript
*/
