import { Request, Response } from "express";
import { VideoUtils } from "../lib/video-utils";
import { generateUniqueId } from "../lib/utils";
import {
  TMultiJobResponse,
  TUserChoiceBody,
  VideoUrlInfo,
} from "../utils/types";
import { jobManager } from "../services/job-manager";
import { webhookService } from "../services/webhook-service";
import { WebhookConfig } from "../types/webhook";
import { fetchFeatureFlagByName } from "../utils/queries";
import { downloadYoutubeVideo } from "../lib/youtube-url-processor";
import { downloadLoomVideo } from "../lib/loom-url-processor";
import { downloadCloudfrontVideo } from "../lib/cloudfront-url-processor";
import path from "path";
import { downloadS3File } from "../lib/s3-url-processor";

export const multiUrlController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const bodyData: TUserChoiceBody & { urls: string[] } = req.body;
  const { urls } = bodyData;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: "Array of video URLs is required" });
    return;
  }

  const userInputs: TUserChoiceBody = {
    preferredNumberOfSteps: bodyData.preferredNumberOfSteps ?? "auto",
    preferredLanguage: bodyData.preferredLanguage ?? "english",
    preferredTonality: bodyData.preferredTonality ?? "auto",
  };

  const videoUtils = new VideoUtils();
  const jobIds: TMultiJobResponse = [];
  const webhookConfig: WebhookConfig | undefined = req.body.callbackUrl
    ? {
        url: req.body.callbackUrl,
        secret: req.body.webhookSecret,
      }
    : undefined;
  const creatorInfo = req.body.creatorInfo;

  try {
    for (const url of urls) {
      const urlType = await videoUtils.validateVideoUrl(url);

      if (urlType === "none") {
        jobIds.push({
          jobId: "N/A",
          mediaPath: url,
          status: "failed",
          message: "Invalid URL",
        });
        continue; // Skip invalid URLs
      }

      if (urlType === "youtube") {
        const response = await fetchFeatureFlagByName("YOUTUBE_URL");
        if (!response?.is_active) continue;
      }

      if (urlType === "loom") {
        const response = await fetchFeatureFlagByName("LOOM_URL");
        if (!response?.is_active) continue;
      }

      const sessionId = generateUniqueId();
      const job = await jobManager.createJob(sessionId, creatorInfo);
      jobIds.push({
        jobId: sessionId,
        mediaPath: url,
        status: job.status,
        message: "Processing started",
      });

      processUrlVideoAsync(
        url,
        urlType,
        sessionId,
        videoUtils,
        userInputs,
        webhookConfig
      ).catch(async (error) => {
        console.error("Error processing video:", error);
        await jobManager.updateJobStatus(
          sessionId,
          "failed",
          undefined,
          error.message
        );

        if (webhookConfig) {
          await webhookService.notifyJobFailed(
            sessionId,
            webhookConfig,
            error.message
          );
        }
      });
    }

    if (jobIds.length === 0) {
      res.status(400).json({
        error: "No valid URLs to process",
      });
      return;
    }

    res.status(202).json({
      jobIds,
      message: "Processing started for valid URLs",
    });
  } catch (error: any) {
    console.error("Error in multi-URL controller:", error);
    res.status(500).json({
      error: "Failed to process videos",
      message: error.message,
    });
  }
};

const processUrlVideoAsync = async (
  url: string,
  urlType: string,
  sessionId: string,
  videoUtils: VideoUtils,
  userInputs: TUserChoiceBody,
  webhookConfig?: WebhookConfig
): Promise<void> => {
  const tmpDir = path.join(process.cwd(), "tmp", sessionId);

  jobManager.updateJobProgress(sessionId, {
    stage: "processing_video",
    progress: 10,
    message: "Initializing...",
  });

  try {
    jobManager.updateJobProgress(sessionId, {
      stage: "downloading_video",
      progress: 20,
      message: "Downloading video...",
    });

    let videoInfo: VideoUrlInfo;
    if (urlType === "youtube") {
      videoInfo = await downloadYoutubeVideo(url, tmpDir);
    } else if (urlType === "loom") {
      videoInfo = await downloadLoomVideo(url, tmpDir);
    } else if (urlType === "cloudfront") {
      videoInfo = await downloadCloudfrontVideo(url, tmpDir);
    } else if (urlType === "s3") {
      videoInfo = await downloadS3File(url, tmpDir);
    } else {
      throw new Error("Invalid video URL");
    }

    jobManager.updateJobProgress(sessionId, {
      stage: "processing_video",
      progress: 30,
      message: "Processing video...",
    });

    const result = await videoUtils.processVideo(
      videoInfo.downloadPath,
      sessionId,
      userInputs
    );

    jobManager.updateJobProgress(sessionId, {
      stage: "processing_video",
      progress: 100,
      message: "Video processed",
    });

    await jobManager.updateJobStatus(sessionId, "completed", result);
    await videoUtils.cleanup(sessionId);

    if (webhookConfig) {
      await webhookService.notifyJobComplete(sessionId, webhookConfig);
    }
  } catch (error: any) {
    await jobManager.updateJobStatus(
      sessionId,
      "failed",
      undefined,
      error.message
    );
    if (webhookConfig) {
      await webhookService.notifyJobFailed(
        sessionId,
        webhookConfig,
        error.message
      );
    }
    throw error;
  }
};
