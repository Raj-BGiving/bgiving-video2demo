import { Request, Response } from "express";
import { VideoUtils } from "../lib/video-utils";
import { generateUniqueId } from "../lib/utils";
import path from "path";
import { TUserChoiceBody, VideoUrlInfo } from "../utils/types";
import { downloadYoutubeVideo } from "../lib/youtube-url-processor";
import { downloadLoomVideo } from "../lib/loom-url-processor";
import { jobManager } from "../services/job-manager";
import { webhookService } from "../services/webhook-service";
import { WebhookConfig } from "../types/webhook";
import { fetchFeatureFlagByName } from "../utils/queries";
import { downloadCloudfrontVideo } from "../lib/cloudfront-url-processor";
import { downloadS3File } from "../lib/s3-url-processor";

export const urlController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const bodyData: TUserChoiceBody = req.body;
  const { url } = bodyData;

  const userInputs: TUserChoiceBody = {
    preferredNumberOfSteps: bodyData.preferredNumberOfSteps ?? "auto",
    preferredLanguage: bodyData.preferredLanguage ?? "english",
    preferredTonality: bodyData.preferredTonality ?? "auto",
  };

  if (!url) {
    res.status(400).json({ error: "Video URL is required" });
    return;
  }

  const videoUtils = new VideoUtils();
  const urlType = await videoUtils.validateVideoUrl(url);

  if (urlType === "none") {
    res.status(400).json({
      error: "Invalid video URL. Only Loom and YouTube URLs are supported.",
    });
    return;
  }

  if (urlType === "youtube") {
    const response = await fetchFeatureFlagByName("YOUTUBE_URL");

    if (!response?.is_active) {
      res.status(400).json({
        error: "Youtube Video URL support is paused",
      });
      return;
    }
  }

  if (urlType === "loom") {
    const response = await fetchFeatureFlagByName("LOOM_URL");

    if (!response?.is_active) {
      res.status(400).json({
        error: "Loom Video URL support is paused",
      });
      return;
    }
  }

  const sessionId = generateUniqueId();
  const webhookConfig: WebhookConfig | undefined = req.body.callbackUrl
    ? {
        url: req.body.callbackUrl,
        secret: req.body.webhookSecret,
      }
    : undefined;
  const creatorInfo = req.body.creatorInfo;

  try {
    const job = await jobManager.createJob(sessionId, creatorInfo);

    res.status(202).json({
      jobId: sessionId,
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
  } catch (error: any) {
    console.error("Error in URL controller:", error);
    res.status(500).json({
      error: "Failed to process video",
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

    console.log("Downloading video...");

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
    console.log("Video downloaded:", videoInfo);

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
