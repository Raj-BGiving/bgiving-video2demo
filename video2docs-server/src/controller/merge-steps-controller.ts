import { Request, Response } from "express";
import { StepsUtils } from "../lib/steps-utils";
import { extractProjectId, generateUniqueId } from "../lib/utils";
import { ProcessedStep } from "../utils/types";

export const mergeStepsController = async (
  req: Request,
  res: Response
): Promise<any> => {
  const steps = req.body.steps as ProcessedStep[];
  const projectId = req.body.projectId || extractProjectId(steps[0].videoPath);

  const sessionId = generateUniqueId();

  const stepUtils = new StepsUtils();

  // checking if all steps are consecutive

  if (!steps || steps.length === 0 || !projectId) {
    return res.status(400).json({
      error: "Steps or projectId is missing",
    });
  }

  const sortedSteps = [...steps].sort((a, b) => a.timestamp - b.timestamp);

  if (!StepsUtils.checkValidConsecutiveSteps(sortedSteps)) {
    return res.status(400).json({
      error: "Steps are not consecutive or invalid",
    });
  }

  try {
    const { mergedVideoDescription, mergedVideoUrl, mergedVideoDuration } =
      await stepUtils.mergeSteps(sortedSteps, projectId, sessionId);
    res.status(200).json({
      serialNumber: sortedSteps[0].serialNumber,
      timestamp: sortedSteps[0].timestamp,
      title: sortedSteps[0].title,
      description: mergedVideoDescription,
      framePath: sortedSteps[0].framePath,
      projectId: projectId,
      videoPath: mergedVideoUrl,
      videoDuration: mergedVideoDuration ?? sortedSteps.length * 6,
    });
  } catch (error: any) {
    console.error("Error in merge steps controller:", error);
    res.status(500).json({
      error: "Failed to merge steps",
      message: error.message,
    });
  }
};
