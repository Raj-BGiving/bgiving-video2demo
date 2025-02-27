import { generateUniqueId } from "../lib/utils";
import { writeFile, unlink, mkdir } from "fs/promises";
import fs from "fs";
import path from "path";
import { VideoUtils } from "../lib/video-utils";
import { ProcessedVideo } from "../utils/types";
import { Request, Response } from "express";
import { jobManager } from "../services/job-manager";
import { webhookService } from "../services/webhook-service";
import { WebhookConfig } from "../types/webhook";
import { TUserChoiceBody } from "../utils/types";

export const fileController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fileBuffer = req.file?.buffer as Buffer;
  const bodyData: TUserChoiceBody = req.body;

  const userInputs: TUserChoiceBody = {
    preferredNumberOfSteps: bodyData.preferredNumberOfSteps ?? "auto",
    preferredLanguage: bodyData.preferredLanguage ?? "english",
    preferredTonality: bodyData.preferredTonality ?? "auto",
  };
  const sessionId = generateUniqueId();
  const webhookConfig: WebhookConfig | undefined = bodyData.callbackUrl
    ? {
        url: bodyData.callbackUrl,
        secret: bodyData.webhookSecret, // Optional
      }
    : undefined;
  let creatorInfo;
  if (typeof bodyData.creatorInfo !== "string") {
    creatorInfo = bodyData.creatorInfo;
  } else {
    creatorInfo = JSON.parse(bodyData.creatorInfo);
  }

  try {
    const job = await jobManager.createJob(sessionId, creatorInfo);

    res.status(202).json({
      jobId: sessionId,
      status: job.status,
      message: "Processing started",
    });

    processVideoAsync(fileBuffer, sessionId, userInputs, webhookConfig).catch(
      async (error) => {
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
      }
    );
  } catch (error: any) {
    console.error("Error in file controller:", error);
    res.status(500).json({
      error: "Failed to process video",
      message: error.message,
    });
  }
};

const processVideoAsync = async (
  fileBuffer: Buffer,
  sessionId: string,
  userInputs: TUserChoiceBody,
  webhookConfig?: WebhookConfig
): Promise<void> => {
  const tmpDir = path.join(process.cwd(), "tmp", sessionId);
  if (!fs.existsSync(tmpDir)) {
    await mkdir(tmpDir, { recursive: true });
  }

  const filePath = path.join(
    process.cwd(),
    "tmp",
    sessionId,
    `${sessionId}.mp4`
  );
  await writeFile(filePath, fileBuffer);

  try {
    jobManager.updateJobStatus(sessionId, "processing");
    const videoUtils = new VideoUtils();

    jobManager.updateJobProgress(sessionId, {
      stage: "processing_video",
      progress: 10,
      message: "Initializing...",
    });

    const result = await videoUtils.processVideo(
      filePath,
      sessionId,
      userInputs
    );

    jobManager.updateJobProgress(sessionId, {
      stage: "processing_video",
      progress: 100,
      message: "Video processed",
    });

    const processedResult: ProcessedVideo = result;

    await jobManager.updateJobStatus(sessionId, "completed", processedResult);
    await videoUtils.cleanup(sessionId);

    if (webhookConfig) {
      await webhookService.notifyJobComplete(sessionId, webhookConfig);
    }
  } catch (error: any) {
    await jobManager.updateJobStatus(sessionId, "failed", undefined, error.message);
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
