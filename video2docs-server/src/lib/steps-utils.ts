import path from "path";
import { ProcessedStep } from "../utils/types";
import fs from "fs";
import { mkdir } from "fs/promises";
import { exec } from "child_process";
import { MediaProcessor } from "./media-processor";
import { S3Utils } from "../utils/s3-utils";
import { AIApiHandler } from "./ai-api-handler";
import {
  STEPS_DESC_MERGE_SYSTEM_PROMPT,
  STEPS_DESC_MERGE_USER_PROMPT,
} from "../utils/prompts";
import { aiModels } from "../utils/ai-models";

export class StepsUtils {
  private aiApiHandler: AIApiHandler;
  private mediaProcessor: MediaProcessor;
  private s3Utils: S3Utils;
  constructor() {
    this.aiApiHandler = new AIApiHandler();
    this.mediaProcessor = new MediaProcessor();
    this.s3Utils = new S3Utils();
  }

  private formatStepDescriptionsToXML(steps: ProcessedStep[]): string {
    const xml = `
    <steps>
      ${steps
        .map(
          (step) => `
        <step>
          <timestamp>${step.timestamp}</timestamp>
          <description>${step.description}</description>
        </step>
      `
        )
        .join("")}
    </steps>
    `;
    return xml;
  }

  async mergeSteps(
    steps: ProcessedStep[],
    projectId: string,
    sessionId: string
  ): Promise<{
    mergedVideoDescription: string;
    mergedVideoUrl: string;
    mergedVideoDuration: number;
  }> {
    let concatenatedName = steps.map((step) => step.timestamp).join("_");
    concatenatedName = `video_${concatenatedName}`;

    const downloadedDir = path.join(process.cwd(), "tmpmerge", sessionId);

    if (!fs.existsSync(downloadedDir)) {
      await mkdir(downloadedDir, { recursive: true });
    }

    const downloadedFilePaths: string[] = [];

    try {
      const downloadPromises = steps.map((step) => {
        const videoUrl = step.videoPath;
        const fileName = `video_${step.timestamp}.mp4`;
        const downloadPath = path.join(downloadedDir, fileName);
        downloadedFilePaths.push(downloadPath);

        return new Promise((resolve, reject) => {
          console.log(`Starting download for ${fileName} from ${videoUrl}`);
          exec(
            `curl -L "${videoUrl}" -o "${downloadPath}"`,
            (error, stdout, stderr) => {
              if (error) {
                console.error(`Download failed for ${fileName}:`, error);
                reject(error);
                return;
              }
              if (stderr) {
                console.log(`Curl stderr for ${fileName}:`, stderr);
              }
              const fileExists = fs.existsSync(downloadPath);
              const fileSize = fileExists ? fs.statSync(downloadPath).size : 0;
              console.log(
                `Download completed for ${fileName}. File exists: ${fileExists}, Size: ${fileSize} bytes`
              );
              resolve(downloadPath);
            }
          );
        });
      });

      try {
        await Promise.all(downloadPromises);

        console.log("Download directory:", downloadedDir);
        for (const filePath of downloadedFilePaths) {
          const exists = fs.existsSync(filePath);
          const size = exists ? fs.statSync(filePath).size : 0;
          console.log(
            `File ${filePath} exists: ${exists}, Size: ${size} bytes`
          );
        }
      } catch (error) {
        throw new Error(`Failed to download one or more videos: ${error}`);
      }

      const mergedOutputPath = path.join(
        process.cwd(),
        "tmpmerge",
        sessionId,
        `video_${concatenatedName}.mp4`
      );

      let userPrompt = STEPS_DESC_MERGE_USER_PROMPT;

      userPrompt = userPrompt.replace(
        "{{stepDescriptions}}",
        this.formatStepDescriptionsToXML(steps)
      );

      const aiResponse = await this.aiApiHandler.generateGroqAITextCompletion(
        { systemPrompt: STEPS_DESC_MERGE_SYSTEM_PROMPT, userPrompt },
        aiModels.groq_models.GEMMA2_9B_IT
      );

      await this.mediaProcessor.mergeVideos(
        downloadedFilePaths,
        mergedOutputPath
      );

      const mergedFileBuffer = fs.readFileSync(mergedOutputPath);

      const mergedVideoUrl = await this.s3Utils.uploadBuffer(
        mergedFileBuffer,
        `${projectId}/merged/${concatenatedName}.mp4`,
        "video/mp4"
      );

      // cleaning the sessionId folder from tmpmerge
      await fs.promises.rm(downloadedDir, { recursive: true });

      return {
        mergedVideoDescription: aiResponse,
        mergedVideoUrl,
        mergedVideoDuration: steps.reduce(
          (totalDuration, step) => totalDuration + step.videoDuration,
          0
        ),
      };
    } catch (error) {
      await fs.promises.rm(downloadedDir, { recursive: true });
      throw new Error(`Failed to merge videos: ${error}`);
    }
  }
  static checkValidConsecutiveSteps(steps: ProcessedStep[]): boolean {
    return steps.every(
      (step, index) =>
        index === 0 || step.serialNumber === steps[index - 1].serialNumber + 1
    );
  }
}
