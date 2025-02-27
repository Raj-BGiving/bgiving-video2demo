import OpenAI from "openai";
import { createReadStream, fstatSync } from "fs";
import { unlink } from "fs/promises";
import { MediaProcessor } from "./media-processor";
import { TranscriptFormatter } from "./transcript-formattor";
import { TSummary, TUserChoiceBody } from "../utils/types";
import {
  STEPS_GEN_SYSTEM_PROMPT,
  STEPS_GEN_SYSTEM_PROMPT_CUSTOMIZED,
  STEPS_GEN_SYSTEM_PROMPT_W_VIDEO_SEGMENTS,
  STEPS_GEN_USER_PROMPT,
  STEPS_GEN_USER_PROMPT_CUSTOMIZED,
  STEPS_GEN_USER_PROMPT_W_VIDEO_SEGMENTS,
} from "../utils/prompts";
import { jobManager } from "../services/job-manager";
import { AIApiHandler } from "./ai-api-handler";
import { aiModels } from "../utils/ai-models";
import fs from "fs";

export class TranscriptProcessor {
  private openai: OpenAI;
  private mediaProcessor: MediaProcessor;
  private aiApiHandler: AIApiHandler;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.mediaProcessor = new MediaProcessor();
    this.aiApiHandler = new AIApiHandler();
  }

  async generateTranscript(
    videoPath: string,
    sessionId: string,
    userInputs: TUserChoiceBody
  ) {
    try {
      let audioPath = await this.mediaProcessor.separateAudio(videoPath);
      const videoPathWithoutAudio =
        await this.mediaProcessor.separateVideoWithoutAudio(videoPath);

      console.log("Audio extracted:", audioPath);

      if (!audioPath || !videoPathWithoutAudio) {
        throw new Error("Failed to extract audio or video");
      }

      const audioFileSize = this.calculateFileSize(audioPath);
      console.log("Audio file size:", audioFileSize);

      if (audioFileSize > 25 * 1024 * 1024) {
        const outputAudioPath = audioPath + "_compressed" + ".mp3";
        audioPath = await this.mediaProcessor.compressAudio(
          audioPath,
          outputAudioPath
        );

        const audioFileSize = this.calculateFileSize(audioPath);
        console.log("Compressed Audio file size:", audioFileSize);

        if (audioFileSize > 25 * 1024 * 1024) {
          throw new Error("Compressed audio file size exceeds limit (25MB)");
        }
      }

      jobManager.updateJobProgress(sessionId, {
        stage: "processing_video",
        progress: 30,
        message: "Generating transcript",
      });

      const transcriptionResponse =
        await this.aiApiHandler.generateOpenAIWhisperTranscript(audioPath);

      await unlink(audioPath).catch(console.error);

      const transcript = transcriptionResponse?.segments?.map((segment) => ({
        timestamp: segment.start,
        text: segment.text.trim(),
      }));

      if (!transcript) {
        throw new Error("Failed to generate transcript");
      }
      const maxVideoDuration = await this.mediaProcessor.getDuration(
        videoPathWithoutAudio
      );

      const xmlTranscript = TranscriptFormatter.toXML(
        transcript,
        maxVideoDuration
      );

      const summary = await this.generateStructuredGuide(
        xmlTranscript,
        maxVideoDuration,
        userInputs
      );

      return {
        transcript,
        summary,
        videoPathWithoutAudio,
        maxVideoDuration,
      };
    } catch (error) {
      console.error("Error processing transcript:", error);
      throw error;
    }
  }

  private async generateStructuredGuide(
    xmlTranscript: string,
    videoDuration: number,
    userInputs: TUserChoiceBody
  ): Promise<TSummary> {
    const { preferredNumberOfSteps, preferredLanguage, preferredTonality } =
      userInputs;
    const systemPrompt = STEPS_GEN_SYSTEM_PROMPT_CUSTOMIZED;
    let userPrompt = STEPS_GEN_USER_PROMPT_CUSTOMIZED;
    userPrompt = userPrompt.replace(
      "{{videoDuration}}",
      Math.floor(videoDuration).toString()
    );
    userPrompt = userPrompt.replace(
      "{{preferredNumberOfSteps}}",
      preferredNumberOfSteps
    );
    userPrompt = userPrompt.replace("{{preferredLanguage}}", preferredLanguage);
    userPrompt = userPrompt.replace("{{preferredTonality}}", preferredTonality);
    userPrompt = userPrompt.replace("{{xmlTranscript}}", xmlTranscript);

    const completion = await this.aiApiHandler.generateOpenAIJSONCompletion(
      {
        systemPrompt,
        userPrompt,
      },
      aiModels.openai_models.GPT_4_TURBO
    );

    return JSON.parse(completion.choices[0].message.content || "{}");
  }

  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  private calculateFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      console.error("Error calculating file size:", error);
      return 0;
    }
  }
}
